/**
 * useFinanceAudit — diagnóstico somente-leitura dos saldos por conta.
 * Não altera nenhum dado. Serve para o bloco "Diagnóstico de saldos"
 * do Dashboard Financeiro identificar inconsistências:
 *  - saldo_inicial zerado;
 *  - lançamentos pagos concentrados em uma única data (importação em lote);
 *  - saldo negativo;
 *  - peso de transferências internas no saldo;
 *  - última data de pagamento registrada.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AccountAuditRow = {
  conta_id: string;
  conta_nome: string;
  banco: string | null;
  saldo_inicial: number;
  saldo_calculado: number;
  movs_pagas: number;
  movs_conciliadas: number;
  total_receitas_pagas: number;
  total_despesas_pagas: number;
  total_transferencias_pagas: number;
  net_transferencias: number;
  ultima_data_pagamento: string | null;
  bulk_date: string | null; // data com mais lançamentos pagos no mesmo dia
  bulk_count: number; // qtd de lançamentos nessa data
};

const num = (v: unknown) => (v == null ? 0 : Number(v));

export function useFinanceAudit() {
  return useQuery({
    queryKey: ["finance_audit_accounts"],
    staleTime: 60_000,
    queryFn: async (): Promise<AccountAuditRow[]> => {
      const [contasRes, movsRes] = await Promise.all([
        supabase
          .from("contas_bancarias")
          .select("id, nome, banco, saldo_inicial")
          .eq("ativo", true)
          .order("nome"),
        supabase
          .from("movimentacoes")
          .select(
            "conta_bancaria_id, tipo, status, valor_previsto, valor_realizado, data_pagamento, conciliado, categoria:categorias(is_transferencia)",
          )
          .is("deleted_at", null),
      ]);

      const contas = contasRes.data ?? [];
      const movs = (movsRes.data ?? []) as Array<{
        conta_bancaria_id: string | null;
        tipo: string;
        status: string;
        valor_previsto: number | null;
        valor_realizado: number | null;
        data_pagamento: string | null;
        conciliado: boolean | null;
        categoria: { is_transferencia: boolean | null } | null;
      }>;

      return contas.map((c) => {
        const ms = movs.filter((m) => m.conta_bancaria_id === c.id);
        const pagas = ms.filter((m) => m.status === "pago");
        const conciliadas = pagas.filter((m) => m.conciliado === true).length;

        const totalReceitasPagas = pagas
          .filter((m) => m.tipo === "receita")
          .reduce((s, m) => s + num(m.valor_realizado ?? m.valor_previsto), 0);
        const totalDespesasPagas = pagas
          .filter((m) => m.tipo === "despesa")
          .reduce((s, m) => s + num(m.valor_realizado ?? m.valor_previsto), 0);

        const transfs = pagas.filter((m) => m.categoria?.is_transferencia === true);
        const totalTransferencias = transfs.reduce(
          (s, m) => s + num(m.valor_realizado ?? m.valor_previsto),
          0,
        );
        const netTransferencias = transfs.reduce((s, m) => {
          const v = num(m.valor_realizado ?? m.valor_previsto);
          return m.tipo === "receita" ? s + v : s - v;
        }, 0);

        // Data com mais pagamentos concentrados
        const byDate = new Map<string, number>();
        for (const m of pagas) {
          if (!m.data_pagamento) continue;
          byDate.set(m.data_pagamento, (byDate.get(m.data_pagamento) ?? 0) + 1);
        }
        let bulkDate: string | null = null;
        let bulkCount = 0;
        for (const [d, n] of byDate) {
          if (n > bulkCount) {
            bulkCount = n;
            bulkDate = d;
          }
        }
        const ultima = pagas
          .map((m) => m.data_pagamento)
          .filter((d): d is string => Boolean(d))
          .sort()
          .pop() ?? null;

        const saldoCalculado =
          num(c.saldo_inicial) + totalReceitasPagas - totalDespesasPagas;

        return {
          conta_id: c.id,
          conta_nome: c.nome,
          banco: c.banco ?? null,
          saldo_inicial: num(c.saldo_inicial),
          saldo_calculado: saldoCalculado,
          movs_pagas: pagas.length,
          movs_conciliadas: conciliadas,
          total_receitas_pagas: totalReceitasPagas,
          total_despesas_pagas: totalDespesasPagas,
          total_transferencias_pagas: totalTransferencias,
          net_transferencias: netTransferencias,
          ultima_data_pagamento: ultima,
          bulk_date: bulkDate,
          bulk_count: bulkCount,
        };
      });
    },
  });
}
