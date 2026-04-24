/**
 * Dados financeiros detalhados de um projeto: parcelas (movimentacoes
 * vinculadas), recorrências (maintenance_contracts + recurring), custos
 * (despesas), integrações.
 *
 * Tudo em queries diretas — sem mock. Conecta-se via `projeto_id` e via
 * `source_entity_type='project'` + `source_entity_id`.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectMovimentacao {
  id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor_previsto: number;
  valor_realizado: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  parcela_atual: number | null;
  total_parcelas: number | null;
  recorrente: boolean;
  categoria_id: string | null;
  fornecedor_id: string | null;
  source_entity_type: string | null;
  source_entity_id: string | null;
}

export interface ProjectMaintenanceContract {
  id: string;
  status: string;
  monthly_fee: number;
  monthly_fee_discount_percent: number | null;
  discount_duration_months: number | null;
  start_date: string;
  end_date: string | null;
  token_budget_brl: number | null;
  hours_budget: number | null;
}

export interface ProjectIntegration {
  id: string;
  name: string;
  provider: string | null;
  estimated_cost_monthly_brl: number | null;
  status: string;
}

export interface ProjectFinanceDetail {
  receitas: ProjectMovimentacao[];
  despesas: ProjectMovimentacao[];
  recurring_receitas: ProjectMovimentacao[];
  contracts: ProjectMaintenanceContract[];
  integrations: ProjectIntegration[];
  categoriasMap: Record<string, string>;
}

export function useProjectFinanceDetail(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-finance-detail", projectId],
    enabled: !!projectId,
    staleTime: 30_000,
    queryFn: async (): Promise<ProjectFinanceDetail> => {
      const contractsPromise = (supabase as any)
        .from("maintenance_contracts")
        .select(
          "id, status, monthly_fee, monthly_fee_discount_percent, discount_duration_months, start_date, end_date, token_budget_brl, hours_budget",
        )
        .eq("project_id", projectId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      const integrationsPromise = (supabase as any)
        .from("project_integrations")
        .select("id, name, provider, estimated_cost_monthly_brl, status")
        .eq("project_id", projectId!)
        .is("deleted_at", null);

      const [contractsRes, integrationsRes] = await Promise.all([
        contractsPromise,
        integrationsPromise,
      ]);

      if (contractsRes.error) throw contractsRes.error;
      if (integrationsRes.error) throw integrationsRes.error;

      const contractIds = ((contractsRes.data ?? []) as { id: string }[])
        .map((contract) => contract.id)
        .filter(Boolean);

      const movementScopes = [
        `projeto_id.eq.${projectId}`,
        `and(source_entity_type.eq.project,source_entity_id.eq.${projectId})`,
      ];

      if (contractIds.length > 0) {
        movementScopes.push(
          `and(source_entity_type.eq.maintenance_contract,source_entity_id.in.(${contractIds.join(",")}))`,
        );
      }

      const movRes = await supabase
        .from("movimentacoes")
        .select(
          "id, tipo, descricao, valor_previsto, valor_realizado, data_vencimento, data_pagamento, status, parcela_atual, total_parcelas, recorrente, categoria_id, fornecedor_id, source_entity_type, source_entity_id, projeto_id",
        )
        .or(movementScopes.join(","))
        .order("data_vencimento", { ascending: true });

      if (movRes.error) throw movRes.error;

      const all = (movRes.data ?? []) as any[];
      const receitas = all.filter((m) => m.tipo === "receita" && !m.recorrente);
      const despesas = all.filter((m) => m.tipo === "despesa");
      const recurring_receitas = all.filter((m) => m.tipo === "receita" && m.recorrente);

      return {
        receitas: receitas as ProjectMovimentacao[],
        despesas: despesas as ProjectMovimentacao[],
        recurring_receitas: recurring_receitas as ProjectMovimentacao[],
        contracts: (contractsRes.data ?? []) as ProjectMaintenanceContract[],
        integrations: (integrationsRes.data ?? []) as ProjectIntegration[],
      };
    },
  });
}
