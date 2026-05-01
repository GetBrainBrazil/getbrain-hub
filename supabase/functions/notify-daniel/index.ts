// Edge function: notify-daniel
// Internal endpoint (chamada por outras edge functions com service role).
// Envia notificação ao Daniel via Resend (email) e Z-API (WhatsApp).
// Cada canal é best-effort: falha em um não derruba o outro.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DANIEL_EMAIL = Deno.env.get("DANIEL_NOTIFICATION_EMAIL") ||
  "daniel@getbrain.com.br";

type NotificationKind =
  | "first_view"
  | "pdf_download"
  | "high_engagement"
  | "manifested_interest"
  | "chat_started"
  | "chat_escalation";

interface NotifyBody {
  proposal_id: string;
  kind: NotificationKind;
  context?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as NotifyBody;
    if (!body.proposal_id || !body.kind) {
      return json({ error: "missing_fields" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Carregar proposta + settings
    const { data: prop } = await admin
      .from("proposals")
      .select(
        "id, organization_id, code, title, client_name, client_company_name, access_token",
      )
      .eq("id", body.proposal_id)
      .maybeSingle();
    if (!prop) return json({ error: "proposal_not_found" }, 404);

    const { data: settings } = await admin
      .from("proposal_ai_settings")
      .select(
        "notify_on_first_view, notify_on_pdf_download, notify_on_high_engagement, notify_on_manifested_interest",
      )
      .eq("organization_id", prop.organization_id)
      .maybeSingle();

    // Respeita configuração por kind
    const allow: Record<NotificationKind, boolean> = {
      first_view: settings?.notify_on_first_view ?? true,
      pdf_download: settings?.notify_on_pdf_download ?? false,
      high_engagement: settings?.notify_on_high_engagement ?? true,
      manifested_interest: settings?.notify_on_manifested_interest ?? true,
      chat_started: settings?.notify_on_high_engagement ?? true,
      chat_escalation: true, // sempre notifica escalation
    };
    if (!allow[body.kind]) {
      return json({ skipped: true, reason: "disabled_in_settings" });
    }

    const clientLabel = prop.client_name || prop.client_company_name ||
      "(cliente)";
    const subjectByKind: Record<NotificationKind, string> = {
      first_view: `👀 ${clientLabel} abriu a proposta ${prop.code}`,
      pdf_download: `📄 ${clientLabel} baixou o PDF de ${prop.code}`,
      high_engagement: `🔥 Alto engajamento na proposta ${prop.code}`,
      manifested_interest: `✨ ${clientLabel} manifestou interesse na ${prop.code}`,
      chat_started: `💬 ${clientLabel} iniciou chat na proposta ${prop.code}`,
      chat_escalation: `🚨 Cliente pediu humano em ${prop.code}`,
    };

    const subject = subjectByKind[body.kind];
    const ctxStr = body.context && Object.keys(body.context).length
      ? `\n\nContexto:\n${JSON.stringify(body.context, null, 2)}`
      : "";
    const message =
      `${subject}\n\nProposta: ${prop.title ?? "(sem título)"} (${prop.code})\nCliente: ${clientLabel}${ctxStr}`;

    // Disparos paralelos (best-effort)
    const [emailResult, whatsappResult] = await Promise.allSettled([
      sendEmail(subject, message, body, prop),
      sendWhatsapp(subject, body, prop),
    ]);

    // Audit log
    await admin.from("audit_logs").insert({
      organization_id: prop.organization_id,
      entity_type: "proposal",
      entity_id: prop.id,
      action: "daniel_notified",
      changes: {
        kind: body.kind,
        email_ok: emailResult.status === "fulfilled" &&
          (emailResult.value as any)?.ok,
        whatsapp_ok: whatsappResult.status === "fulfilled" &&
          (whatsappResult.value as any)?.ok,
        context: body.context ?? null,
      },
    }).then(() => {}).catch(() => {});

    return json({
      ok: true,
      email: emailResult.status === "fulfilled"
        ? emailResult.value
        : { ok: false, error: String(emailResult.reason) },
      whatsapp: whatsappResult.status === "fulfilled"
        ? whatsappResult.value
        : { ok: false, error: String(whatsappResult.reason) },
    });
  } catch (e) {
    console.error("notify-daniel error", e);
    return json({ error: "internal", details: String(e) }, 500);
  }
});

async function sendEmail(
  subject: string,
  message: string,
  body: NotifyBody,
  prop: any,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    return { ok: false, error: "missing_resend_credentials" };
  }

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0F172A; margin: 0 0 12px;">${escapeHtml(subject)}</h2>
      <p style="color: #475569; line-height: 1.6;">
        Proposta: <strong>${escapeHtml(prop.title ?? "(sem título)")}</strong>
        (<code>${escapeHtml(prop.code)}</code>)<br/>
        Cliente: <strong>${
    escapeHtml(prop.client_name || prop.client_company_name || "—")
  }</strong>
      </p>
      ${
    body.context && Object.keys(body.context).length
      ? `<pre style="background:#F1F5F9;padding:12px;border-radius:6px;font-size:12px;color:#1E293B;overflow:auto;">${
        escapeHtml(JSON.stringify(body.context, null, 2))
      }</pre>`
      : ""
  }
      <p style="color: #94A3B8; font-size: 12px; margin-top: 24px;">
        GetBrain · Notificação automática
      </p>
    </div>
  `;

  const res = await fetch(
    "https://connector-gateway.lovable.dev/resend/emails",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "GetBrain Propostas <propostas@notify.getbrain.com.br>",
        to: [DANIEL_EMAIL],
        subject,
        html,
        text: message,
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("resend send failed", res.status, errText);
    return { ok: false, status: res.status, error: errText.slice(0, 200) };
  }
  return { ok: true, status: res.status };
}

async function sendWhatsapp(
  subject: string,
  _body: NotifyBody,
  _prop: any,
): Promise<{ ok: boolean; error?: string }> {
  const instance = Deno.env.get("Z_API_DANIEL_INSTANCE_ID");
  const token = Deno.env.get("Z_API_DANIEL_TOKEN");
  const phone = Deno.env.get("Z_API_DANIEL_PHONE");
  if (!instance || !token || !phone) {
    return { ok: false, error: "zapi_not_configured" };
  }

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instance}/token/${token}/send-text`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message: subject }),
      },
    );
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
