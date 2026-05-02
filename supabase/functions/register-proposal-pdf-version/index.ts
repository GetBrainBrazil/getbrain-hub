/**
 * register-proposal-pdf-version
 *
 * Edge function interna (verify_jwt = false; valida JWT em código) que registra
 * uma nova versão do PDF de uma proposta. Quem fez upload do blob foi o cliente
 * (React-PDF -> Storage). Esta função:
 *   1. Insere linha em `proposal_versions` (trigger SQL define version_number).
 *   2. Atualiza `proposals.pdf_url` e `pdf_generated_at` pra apontar pra última versão.
 *   3. Grava `audit_logs` com action `pdf_generated` ou `pdf_regenerated`.
 *
 * Em caso de falha do client durante a geração, este endpoint também aceita
 * `mode: "failure"` pra registrar `pdf_generation_failed` em audit_logs.
 *
 * Spec: Prompt 10D-1 (Estrutura Técnica de PDF Próprio).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { z } from "https://esm.sh/zod@3.23.8";

const SuccessSchema = z.object({
  mode: z.literal("success"),
  proposal_id: z.string().uuid(),
  pdf_storage_path: z.string().min(1),
  pdf_size_bytes: z.number().int().nonnegative(),
  template_key: z.string().min(1),
  template_version: z.string().min(1),
  is_regeneration: z.boolean().default(false),
  notes: z.string().nullable().optional(),
  snapshot: z.record(z.unknown()),
});

const FailureSchema = z.object({
  mode: z.literal("failure"),
  proposal_id: z.string().uuid(),
  template_key: z.string().min(1),
  template_version: z.string().min(1),
  error_message: z.string().max(2000),
});

const BodySchema = z.discriminatedUnion("mode", [SuccessSchema, FailureSchema]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsRes, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsRes.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const body = parsed.data;

    // Carrega proposta-pai pra organization_id e código
    const { data: parent, error: parentErr } = await supabase
      .from("proposals")
      .select("id, code, organization_id")
      .eq("id", body.proposal_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (parentErr || !parent) {
      return new Response(JSON.stringify({ error: "Proposta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.mode === "failure") {
      await supabase.from("audit_logs").insert({
        organization_id: (parent as any).organization_id,
        actor_id: userId,
        entity_type: "proposal",
        entity_id: body.proposal_id,
        action: "pdf_generation_failed",
        metadata: {
          template_key: body.template_key,
          template_version: body.template_version,
          error_message: body.error_message,
        },
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // mode === "success"
    const { data: inserted, error: insErr } = await supabase
      .from("proposal_versions")
      .insert({
        proposal_id: body.proposal_id,
        organization_id: (parent as any).organization_id,
        // version_number=0 → trigger SQL set_proposal_version_number resolve auto
        version_number: 0,
        pdf_url: body.pdf_storage_path,
        pdf_storage_path: body.pdf_storage_path,
        pdf_size_bytes: body.pdf_size_bytes,
        template_key: body.template_key,
        template_version: body.template_version,
        notes: body.notes ?? null,
        generated_by: userId,
        created_by: userId,
        updated_by: userId,
        snapshot: body.snapshot,
      })
      .select("id, version_number")
      .single();
    if (insErr || !inserted) {
      return new Response(
        JSON.stringify({ error: insErr?.message || "Falha ao registrar versão" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("proposals")
      .update({ pdf_url: body.pdf_storage_path, pdf_generated_at: nowIso })
      .eq("id", body.proposal_id);

    await supabase.from("audit_logs").insert({
      organization_id: (parent as any).organization_id,
      actor_id: userId,
      entity_type: "proposal",
      entity_id: body.proposal_id,
      action: body.is_regeneration ? "pdf_regenerated" : "pdf_generated",
      metadata: {
        version_number: (inserted as any).version_number,
        template_key: body.template_key,
        template_version: body.template_version,
        pdf_size_bytes: body.pdf_size_bytes,
        pdf_storage_path: body.pdf_storage_path,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        version_id: (inserted as any).id,
        version_number: (inserted as any).version_number,
        pdf_storage_path: body.pdf_storage_path,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[register-proposal-pdf-version] erro", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
