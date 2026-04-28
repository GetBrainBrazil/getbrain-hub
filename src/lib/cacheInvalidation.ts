/**
 * Helpers centralizados de invalidação de cache (React Query).
 *
 * REGRA DO SISTEMA: toda mutação que afeta dados visíveis em outro módulo
 * DEVE chamar o helper correspondente daqui. Nunca confiar em `loadData()`
 * local — ele só atualiza a tela atual e deixa os outros módulos com cache
 * obsoleto.
 *
 * Centralizar aqui significa que, quando criarmos uma nova queryKey que
 * depende de `movimentacoes`, basta adicionar 1 linha neste arquivo e TODOS
 * os pontos de mutação ganham a invalidação automaticamente.
 */
import type { QueryClient } from "@tanstack/react-query";

type FinanceOpts = {
  projectId?: string | null;
  recurrenceId?: string | null;
  clientId?: string | null;
  supplierId?: string | null;
};

/**
 * Invalida todas as caches que dependem de `movimentacoes` /
 * `financial_recurrences` / dashboards financeiros.
 *
 * Quando a mutação tocou um projeto específico, passe `projectId` para que
 * o card `/projetos/:id/financeiro` e `project-metrics` daquele projeto
 * sejam atualizados imediatamente.
 */
export function invalidateFinanceCaches(qc: QueryClient, opts: FinanceOpts = {}) {
  // Listas / dashboards globais — predicates pegam todas as variantes de filtro
  qc.invalidateQueries({ queryKey: ["movimentacoes"] });
  qc.invalidateQueries({ queryKey: ["financeiro_dashboard_kpis"] });
  qc.invalidateQueries({ queryKey: ["financeiro_serie_mensal"] });
  qc.invalidateQueries({ queryKey: ["financeiro_fluxo_projetado"] });
  qc.invalidateQueries({ queryKey: ["finance_projection"] });
  qc.invalidateQueries({ queryKey: ["finance_reference_lists"] });
  qc.invalidateQueries({ queryKey: ["finance"] }); // pega ["finance", "project_profitability"], ["finance", "monthly_evolution"], etc.
  qc.invalidateQueries({ queryKey: ["extrato_movimentacoes"] });
  qc.invalidateQueries({ queryKey: ["finance_audit_accounts"] });

  // Recorrências (sempre invalidamos a lista, e o detalhe se vier ID)
  qc.invalidateQueries({ queryKey: ["recorrencias"] });
  qc.invalidateQueries({ queryKey: ["recurrence_kpis"] });
  if (opts.recurrenceId) {
    qc.invalidateQueries({ queryKey: ["recorrencia", opts.recurrenceId] });
    qc.invalidateQueries({ queryKey: ["recurrence_detail", opts.recurrenceId] });
  }

  // Projeto específico — refletir card operacional/financeiro instantaneamente
  if (opts.projectId) {
    invalidateProjectCaches(qc, opts.projectId);
  }
}

/**
 * Invalida caches que dependem de um projeto (header, métricas, listas,
 * financeiro detalhado, suporte, tarefas, etc.). Use sempre que algo
 * referente ao projeto mudar (status, contrato, integração, parcela, etc.).
 */
export function invalidateProjectCaches(qc: QueryClient, projectId?: string | null) {
  qc.invalidateQueries({ queryKey: ["projects"] });
  qc.invalidateQueries({ queryKey: ["projetos"] });
  qc.invalidateQueries({ queryKey: ["projetos_list"] });

  if (projectId) {
    qc.invalidateQueries({ queryKey: ["project-finance-detail", projectId] });
    qc.invalidateQueries({ queryKey: ["project-metrics", projectId] });
    qc.invalidateQueries({ queryKey: ["projeto-header", projectId] });
    qc.invalidateQueries({ queryKey: ["project-contacts", projectId] });
    qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    qc.invalidateQueries({ queryKey: ["project-support", projectId] });
    qc.invalidateQueries({ queryKey: ["project-tokens", projectId] });
  }
}

type CrmOpts = {
  dealId?: string | null;
  leadId?: string | null;
  companyId?: string | null;
};

/**
 * Invalida caches do CRM (deals, leads, empresas, dashboard, KPIs).
 */
export function invalidateCrmCaches(qc: QueryClient, opts: CrmOpts = {}) {
  qc.invalidateQueries({ queryKey: ["deals"] });
  qc.invalidateQueries({ queryKey: ["leads"] });
  qc.invalidateQueries({ queryKey: ["companies"] });
  qc.invalidateQueries({ queryKey: ["crm-dashboard"] });
  qc.invalidateQueries({ queryKey: ["crm-dashboard-exec"] });
  qc.invalidateQueries({ queryKey: ["crm-metrics"] });
  qc.invalidateQueries({ queryKey: ["deals-indicators"] });

  if (opts.dealId) {
    qc.invalidateQueries({ queryKey: ["deal", opts.dealId] });
    qc.invalidateQueries({ queryKey: ["deal-activities", opts.dealId] });
    qc.invalidateQueries({ queryKey: ["deal-dependencies", opts.dealId] });
  }
  if (opts.leadId) {
    qc.invalidateQueries({ queryKey: ["lead", opts.leadId] });
  }
  if (opts.companyId) {
    qc.invalidateQueries({ queryKey: ["company", opts.companyId] });
    qc.invalidateQueries({ queryKey: ["company-contacts", opts.companyId] });
  }
}

type ProposalOpts = {
  proposalId?: string | null;
  dealId?: string | null;
  projectId?: string | null;
};

/**
 * Invalida caches de propostas/orçamentos. Como uma proposta cruza CRM
 * (deal) e Projetos (após fechamento), também repassa para os helpers
 * correspondentes.
 */
export function invalidateProposalCaches(qc: QueryClient, opts: ProposalOpts = {}) {
  qc.invalidateQueries({ queryKey: ["proposals"] });
  qc.invalidateQueries({ queryKey: ["proposal-kpis"] });

  if (opts.proposalId) {
    qc.invalidateQueries({ queryKey: ["proposal", opts.proposalId] });
    qc.invalidateQueries({ queryKey: ["proposal-detail", opts.proposalId] });
    qc.invalidateQueries({ queryKey: ["proposal-versions", opts.proposalId] });
  }
  if (opts.dealId) {
    invalidateCrmCaches(qc, { dealId: opts.dealId });
  }
  if (opts.projectId) {
    invalidateProjectCaches(qc, opts.projectId);
  }
}
