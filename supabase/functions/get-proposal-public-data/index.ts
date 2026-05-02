// Edge function: get-proposal-public-data
// Public endpoint protected by access_jwt issued by verify-proposal-access.
// Returns sanitized proposal payload for the public page.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const proposalId = await getProposalIdFromJwt(req);
    if (!proposalId) return json({ error: "unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: prop, error } = await admin
      .from("proposals")
      .select(
        `id, code, title, client_name, client_company_name, client_city,
         client_logo_url, client_brand_color, welcome_message,
         executive_summary, pain_context, solution_overview,
         considerations, maintenance_description, maintenance_monthly_value,
         implementation_days, validation_days, expires_at, valid_until,
         mockup_url, sent_at, status, template_slug, template_version,
         company_id, implementation_value, installments_count,
         first_installment_date, public_opening_letter, public_roadmap,
         investment_layout, show_investment_breakdown, created_by`,
      )
      .eq("id", proposalId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !prop) return json({ error: "not_found" }, 404);

    // Conteúdo institucional editável (singleton por organização). Usa org default
    // pois o sistema é single-org. Se não existir, retorna null e o frontend usa fallbacks.
    const { data: pageSettings } = await admin
      .from("public_page_settings")
      .select(
        `hero_eyebrows, hero_scroll_cue, section_eyebrows, section_titles,
         about_paragraphs, capabilities, tech_stack,
         next_steps_title, next_steps_paragraphs,
         footer_tagline, footer_contact_label,
         password_gate_title, password_gate_subtitle, password_gate_button,
         contact_whatsapp, contact_email, contact_display_name, kpi_labels`,
      )
      .eq("organization_id", "00000000-0000-0000-0000-000000000001")
      .maybeSingle();

    const { data: items } = await admin
      .from("proposal_items")
      .select(
        "id, description, quantity, unit_price, total, order_index, detailed_description, deliverables, acceptance_criteria, client_dependencies, long_description",
      )
      .eq("proposal_id", proposalId)
      .is("deleted_at", null)
      .order("order_index", { ascending: true });

    // Contato primário (para personalização "Olá, X")
    let recipientName: string | null = null;
    if (prop.company_id) {
      const { data: cps } = await admin
        .from("company_people")
        .select("is_primary_contact, ended_at, person:people(full_name, deleted_at)")
        .eq("company_id", prop.company_id)
        .is("ended_at", null)
        .order("is_primary_contact", { ascending: false })
        .limit(5);
      const primary = (cps ?? []).find((r: any) => r.is_primary_contact && r.person && !r.person.deleted_at)
        ?? (cps ?? []).find((r: any) => r.person && !r.person.deleted_at);
      const fullName: string | undefined = (primary as any)?.person?.full_name;
      if (fullName) recipientName = fullName.split(/\s+/)[0];
    }

    return json({
      proposal: {
        code: prop.code,
        title: prop.title,
        client_name: prop.client_name ?? prop.client_company_name,
        client_company_name: prop.client_company_name,
        client_city: prop.client_city,
        client_logo_url: prop.client_logo_url,
        client_brand_color: prop.client_brand_color,
        welcome_message: prop.welcome_message,
        executive_summary: prop.executive_summary,
        pain_context: prop.pain_context,
        solution_overview: prop.solution_overview,
        considerations: prop.considerations ?? [],
        maintenance_description: prop.maintenance_description,
        maintenance_monthly_value: prop.maintenance_monthly_value,
        implementation_days: prop.implementation_days,
        validation_days: prop.validation_days,
        expires_at: prop.expires_at ?? prop.valid_until,
        mockup_url: prop.mockup_url,
        sent_at: prop.sent_at,
        recipient_first_name: recipientName,
        implementation_value: prop.implementation_value,
        installments_count: prop.installments_count,
        first_installment_date: prop.first_installment_date,
        public_opening_letter: prop.public_opening_letter,
        public_roadmap: prop.public_roadmap,
        investment_layout: (prop as any).investment_layout ?? "total_first",
        show_investment_breakdown: (prop as any).show_investment_breakdown ?? true,
        items: items ?? [],
      },
      page_settings: pageSettings ?? null,
    });
  } catch (e) {
    console.error("get-proposal-public-data error", e);
    return json({ error: "internal_error" }, 500);
  }
});

async function getProposalIdFromJwt(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const secret = Deno.env.get("PROPOSAL_ACCESS_JWT_SECRET")!;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    const payload = await verify(token, key);
    return (payload as any)?.proposal_id ?? null;
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
