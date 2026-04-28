// Human-friendly formatting for audit log entries.
// Maps DB column names → labels, entity_type → module/submodule, raw values → text.

export type AuditModule = "crm" | "projetos" | "financeiro" | "admin" | "configuracoes" | "outros";
export type AuditAction = "create" | "update" | "delete" | "status_change" | "login" | "other";

const ENTITY_TO_MODULE: Record<string, { module: AuditModule; submoduleLabel: string }> = {
  // CRM
  deals: { module: "crm", submoduleLabel: "Deal" },
  leads: { module: "crm", submoduleLabel: "Lead" },
  companies: { module: "crm", submoduleLabel: "Empresa" },
  people: { module: "crm", submoduleLabel: "Pessoa" },
  deal_activities: { module: "crm", submoduleLabel: "Atividade" },
  deal_dependencies: { module: "crm", submoduleLabel: "Dependência" },
  // Projetos
  projects: { module: "projetos", submoduleLabel: "Projeto" },
  project_tasks: { module: "projetos", submoduleLabel: "Tarefa" },
  project_milestones: { module: "projetos", submoduleLabel: "Marco" },
  // Financeiro
  movimentacoes: { module: "financeiro", submoduleLabel: "Movimentação" },
  financial_recurrences: { module: "financeiro", submoduleLabel: "Recorrência" },
  contas_bancarias: { module: "financeiro", submoduleLabel: "Conta bancária" },
  categorias: { module: "financeiro", submoduleLabel: "Categoria" },
  centros_custo: { module: "financeiro", submoduleLabel: "Centro de custo" },
  orcamento: { module: "financeiro", submoduleLabel: "Orçamento" },
  maintenance_contracts: { module: "financeiro", submoduleLabel: "Contrato" },
  clientes: { module: "financeiro", submoduleLabel: "Cliente" },
  fornecedores: { module: "financeiro", submoduleLabel: "Fornecedor" },
  colaboradores: { module: "financeiro", submoduleLabel: "Colaborador" },
  // Admin
  profiles: { module: "admin", submoduleLabel: "Usuário" },
  cargos: { module: "admin", submoduleLabel: "Cargo" },
  cargo_permissoes: { module: "admin", submoduleLabel: "Permissão" },
  usuario_cargos: { module: "admin", submoduleLabel: "Vínculo de cargo" },
  // Auth
  auth: { module: "admin", submoduleLabel: "Autenticação" },
};

export function resolveModule(entityType: string | null | undefined): { module: AuditModule; submoduleLabel: string } {
  if (!entityType) return { module: "outros", submoduleLabel: "Sistema" };
  return ENTITY_TO_MODULE[entityType] ?? { module: "outros", submoduleLabel: entityType };
}

const FIELD_LABELS: Record<string, string> = {
  // Comuns
  title: "Título",
  name: "Nome",
  description: "Descrição",
  notes: "Observações",
  status: "Status",
  stage: "Estágio",
  owner_actor_id: "Responsável",
  contact_person_id: "Contato",
  company_id: "Empresa",
  // Deals
  estimated_value: "Valor estimado",
  probability_pct: "Probabilidade",
  expected_close_date: "Data prevista",
  next_step: "Próximo passo",
  next_step_date: "Data próximo passo",
  pain_description: "Dor identificada",
  pain_cost_brl_monthly: "Custo da dor (mensal)",
  pain_hours_monthly: "Horas da dor (mensal)",
  scope_in: "Escopo incluído",
  scope_out: "Escopo excluído",
  budget_range_min: "Orçamento mínimo",
  budget_range_max: "Orçamento máximo",
  estimated_hours_total: "Horas estimadas",
  decision_makers: "Decisores",
  competitors: "Concorrentes",
  current_solution: "Solução atual",
  business_context: "Contexto comercial",
  lost_reason: "Motivo da perda",
  closed_at: "Fechado em",
  // Financeiro
  valor_previsto: "Valor previsto",
  valor_realizado: "Valor realizado",
  data_vencimento: "Vencimento",
  data_pagamento: "Pagamento",
  data_competencia: "Competência",
  conta_bancaria_id: "Conta bancária",
  categoria_id: "Categoria",
  fornecedor_id: "Fornecedor",
  cliente_id: "Cliente",
  projeto_id: "Projeto",
  conciliado: "Conciliado",
  // Projetos
  project_type: "Tipo de projeto",
  contract_value: "Valor do contrato",
  start_date: "Início",
  end_date: "Término",
  // Sistema
  created_at: "Criado em",
  updated_at: "Atualizado em",
  deleted_at: "Removido em",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const HIDDEN_FIELDS = new Set(["updated_at", "updated_by", "stage_changed_at"]);

export function isMeaningfulField(field: string): boolean {
  return !HIDDEN_FIELDS.has(field);
}

export function formatValue(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    // ISO date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
      } catch {}
    }
    return value.length > 80 ? value.slice(0, 77) + "…" : value;
  }
  if (Array.isArray(value)) return value.length === 0 ? "—" : `${value.length} item(ns)`;
  if (typeof value === "object") return JSON.stringify(value).slice(0, 80);
  return String(value);
}

export function actionLabel(action: string): string {
  const a = action.toLowerCase();
  if (a === "create" || a === "insert") return "Criou";
  if (a === "update") return "Alterou";
  if (a === "delete") return "Removeu";
  if (a === "status_change") return "Mudou status";
  if (a === "login") return "Fez login";
  if (a === "logout") return "Deslogou";
  return action;
}

export function normalizeAction(action: string): AuditAction {
  const a = action.toLowerCase();
  if (a === "create" || a === "insert") return "create";
  if (a === "update") return "update";
  if (a === "delete") return "delete";
  if (a === "status_change") return "status_change";
  if (a === "login") return "login";
  return "other";
}

export const ACTION_COLORS: Record<AuditAction, string> = {
  create: "bg-emerald-500",
  update: "bg-amber-500",
  delete: "bg-red-500",
  status_change: "bg-sky-500",
  login: "bg-violet-500",
  other: "bg-muted-foreground",
};

export const MODULE_LABEL: Record<AuditModule, string> = {
  crm: "CRM",
  projetos: "Projetos",
  financeiro: "Financeiro",
  admin: "Admin",
  configuracoes: "Configurações",
  outros: "Outros",
};
