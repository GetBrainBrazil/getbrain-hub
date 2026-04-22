// Edge Function: milestone-billing-trigger
// Quando um project_milestone tem triggers_billing=true e billing_amount > 0,
// e seu status muda para 'concluido', cria um lançamento de Contas a Receber
// na tabela movimentacoes, com rastreabilidade total via source_*.
//
// Invocação: supabase.functions.invoke("milestone-billing-trigger", { body: { milestone_id } })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GETBRAIN_ORG_ID = "00000000-0000-0000-0000-000000000001";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { milestone_id } = await req.json();
    if (!milestone_id || typeof milestone_id !== "string") {
      return json({ error: "milestone_id é obrigatório" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Buscar marco
    const { data: milestone, error: mErr } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("id", milestone_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (mErr) return json({ error: mErr.message }, 500);
    if (!milestone) return json({ error: "Marco não encontrado" }, 404);

    // 2. Validações
    if (!milestone.triggers_billing) {
      return json({ skipped: true, reason: "triggers_billing=false" }, 200);
    }
    if (!milestone.billing_amount || Number(milestone.billing_amount) <= 0) {
      return json({ skipped: true, reason: "billing_amount inválido" }, 200);
    }
    if (milestone.status !== "concluido") {
      return json({ skipped: true, reason: "status != concluido" }, 200);
    }

    // 3. Idempotência: já existe lançamento para este marco?
    const { data: existing } = await supabase
      .from("movimentacoes")
      .select("id")
      .eq("source_module", "project_milestones")
      .eq("source_entity_id", milestone.id)
      .limit(1);
    if (existing && existing.length > 0) {
      return json(
        { skipped: true, reason: "lançamento já existe", id: existing[0].id },
        200,
      );
    }

    // 4. Buscar projeto + cliente
    const { data: project } = await supabase
      .from("projects")
      .select("id, code, name, company_id")
      .eq("id", milestone.project_id)
      .maybeSingle();
    if (!project) return json({ error: "Projeto não encontrado" }, 404);

    // 5. Tentar mapear company → cliente da tabela 'clientes' (nome compatível)
    let clienteId: string | null = null;
    const { data: company } = await supabase
      .from("companies")
      .select("legal_name, trade_name, cnpj")
      .eq("id", project.company_id)
      .maybeSingle();
    if (company) {
      const search = company.cnpj || company.trade_name || company.legal_name;
      if (search) {
        const { data: cli } = await supabase
          .from("clientes")
          .select("id")
          .or(
            `cpf_cnpj.eq.${company.cnpj ?? ""},nome.ilike.${company.trade_name ?? company.legal_name},nome_empresa.ilike.${company.trade_name ?? company.legal_name}`,
          )
          .limit(1);
        if (cli && cli.length > 0) clienteId = cli[0].id;
      }
    }

    // 6. Calcular vencimento: 15 dias após actual_date (ou hoje)
    const baseDate = milestone.actual_date
      ? new Date(milestone.actual_date)
      : new Date();
    const venc = new Date(baseDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    const vencStr = venc.toISOString().slice(0, 10);
    const compStr = baseDate.toISOString().slice(0, 10);

    // 7. Inserir movimentação
    const descricao = `Cobrança por marco concluído: ${milestone.title} — ${project.code} ${project.name}`;
    const { data: mov, error: insErr } = await supabase
      .from("movimentacoes")
      .insert({
        tipo: "receita",
        descricao,
        valor_previsto: Number(milestone.billing_amount),
        data_competencia: compStr,
        data_vencimento: vencStr,
        cliente_id: clienteId,
        status: "pendente",
        source_module: "project_milestones",
        source_entity_type: "project_milestone",
        source_entity_id: milestone.id,
        is_automatic: true,
      })
      .select("id")
      .single();

    if (insErr) return json({ error: insErr.message }, 500);

    // 8. Audit log
    await supabase.from("audit_logs").insert({
      organization_id: GETBRAIN_ORG_ID,
      actor_id: null,
      entity_type: "project_milestone",
      entity_id: milestone.id,
      action: "custom",
      metadata: {
        event: "milestone_billing_generated",
        billing_generated: true,
        financial_transaction_id: mov.id,
        amount: Number(milestone.billing_amount),
      },
    });

    return json({ ok: true, movimentacao_id: mov.id }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
