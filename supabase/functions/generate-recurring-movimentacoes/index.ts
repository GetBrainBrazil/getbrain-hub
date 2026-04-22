// Edge function: gera a parcela do mês corrente para todas as movimentações
// recorrentes mensais ativas que ainda não têm uma ocorrência criada para o mês.
// Acionada via pg_cron no dia 01 de cada mês, ou manualmente pela UI.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

// Move uma data "antiga" para o mês alvo, mantendo o mesmo dia (ou último dia válido).
function moveToMonth(originalIso: string, targetYear: number, targetMonth0: number): string {
  const orig = new Date(originalIso + "T12:00:00");
  const day = orig.getDate();
  const last = lastDayOfMonth(targetYear, targetMonth0);
  const finalDay = Math.min(day, last);
  return ymd(new Date(targetYear, targetMonth0, finalDay));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date();
    const targetYear = today.getFullYear();
    const targetMonth0 = today.getMonth();
    const monthStart = ymd(new Date(targetYear, targetMonth0, 1));
    const monthEnd = ymd(new Date(targetYear, targetMonth0 + 1, 0));

    // 1. Buscar todas as movimentações pai recorrentes mensais ativas
    const { data: parents, error: parentsErr } = await supabase
      .from("movimentacoes")
      .select("*")
      .is("movimentacao_pai_id", null)
      .eq("recorrente", true)
      .eq("frequencia_recorrencia", "mensal")
      .eq("recorrencia_ativa", true)
      .neq("status", "cancelado");

    if (parentsErr) throw parentsErr;

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const parent of parents || []) {
      try {
        // Verifica se já existe ocorrência (pai ou filha) com data_competencia no mês corrente
        // Considera tanto o próprio pai quanto qualquer filho cuja competência caia no mês.
        const parentCompMonth = parent.data_competencia?.slice(0, 7);
        const targetMonthStr = monthStart.slice(0, 7);

        if (parentCompMonth === targetMonthStr) {
          skipped++;
          continue;
        }

        const { data: existing, error: existsErr } = await supabase
          .from("movimentacoes")
          .select("id")
          .eq("movimentacao_pai_id", parent.id)
          .gte("data_competencia", monthStart)
          .lte("data_competencia", monthEnd)
          .limit(1);

        if (existsErr) throw existsErr;
        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }

        // Monta a nova ocorrência clonando o pai
        const novaCompetencia = moveToMonth(parent.data_competencia, targetYear, targetMonth0);
        const novoVencimento = moveToMonth(parent.data_vencimento, targetYear, targetMonth0);

        const novo: Record<string, unknown> = {
          tipo: parent.tipo,
          descricao: parent.descricao,
          valor_previsto: parent.valor_previsto,
          data_competencia: novaCompetencia,
          data_vencimento: novoVencimento,
          status: "pendente",
          cliente_id: parent.cliente_id,
          fornecedor_id: parent.fornecedor_id,
          colaborador_id: parent.colaborador_id,
          projeto_id: parent.projeto_id,
          categoria_id: parent.categoria_id,
          centro_custo_id: parent.centro_custo_id,
          conta_bancaria_id: parent.conta_bancaria_id,
          meio_pagamento_id: parent.meio_pagamento_id,
          observacoes: parent.observacoes,
          tags: parent.tags,
          desconto_previsto: parent.desconto_previsto,
          pis: parent.pis,
          cofins: parent.cofins,
          csll: parent.csll,
          iss: parent.iss,
          ir: parent.ir,
          inss: parent.inss,
          juros: parent.juros,
          multa: parent.multa,
          taxas_adm: parent.taxas_adm,
          recorrente: true,
          frequencia_recorrencia: "mensal",
          movimentacao_pai_id: parent.id,
          is_automatic: true,
          source_module: "recurrence_job",
          source_entity_type: "movimentacao",
          source_entity_id: parent.id,
        };

        const { error: insErr } = await supabase.from("movimentacoes").insert(novo);
        if (insErr) throw insErr;
        created++;
      } catch (e) {
        errors.push(`pai ${parent.id}: ${(e as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        month: monthStart.slice(0, 7),
        parents_checked: parents?.length ?? 0,
        created,
        skipped,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
