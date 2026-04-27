import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { z } from "https://esm.sh/zod@3.23.8";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1).max(200),
  telefone: z.string().max(40).optional().nullable(),
  cargo_id: z.string().uuid().optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { email, password, full_name, telefone, cargo_id, avatar_url } = parsed.data;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name },
    });
    if (createErr || !created.user) return json({ error: createErr?.message ?? "Create failed" }, 400);

    const newId = created.user.id;
    await admin.from("profiles").upsert({
      id: newId, full_name, email, telefone: telefone ?? null, avatar_url: avatar_url ?? null, ativo: true,
    });

    if (cargo_id) {
      await admin.from("usuario_cargos").insert({ user_id: newId, cargo_id, assigned_by: user.id });
      const { data: cargo } = await admin.from("cargos").select("nome").eq("id", cargo_id).single();
      if (cargo?.nome === "Administrador") {
        await admin.from("user_roles").upsert({ user_id: newId, role: "admin" }, { onConflict: "user_id,role" });
      }
    }

    return json({ ok: true, user_id: newId });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
