// Human-friendly formatting for audit log entries.

export type AuditModule = "crm" | "projetos" | "financeiro" | "admin" | "configuracoes" | "outros";
export type AuditAction = "create" | "update" | "delete" | "status_change" | "login" | "other";

const ENTITY_TO_MODULE: Record<string, { module: AuditModule; submoduleLabel: string; entityNoun: string }> = {
  // CRM
  deals: { module: "crm", submoduleLabel: "Deal", entityNoun: "deal" },
  leads: { module: "crm", submoduleLabel: "Lead", entityNoun: "lead" },
  companies: { module: "crm", submoduleLabel: "Empresa", entityNoun: "empresa" },
  people: { module: "crm", submoduleLabel: "Pessoa", entityNoun: "pessoa" },
  deal_activities: { module: "crm", submoduleLabel: "Atividade", entityNoun: "atividade" },
  deal_dependencies: { module: "crm", submoduleLabel: "Dependência", entityNoun: "dependência" },
  // Projetos
  projects: { module: "projetos", submoduleLabel: "Projeto", entityNoun: "projeto" },
  project_tasks: { module: "projetos", submoduleLabel: "Tarefa", entityNoun: "tarefa" },
  project_milestones: { module: "projetos", submoduleLabel: "Marco", entityNoun: "marco" },
  // Financeiro
  movimentacoes: { module: "financeiro", submoduleLabel: "Movimentação", entityNoun: "movimentação" },
  financial_recurrences: { module: "financeiro", submoduleLabel: "Recorrência", entityNoun: "recorrência" },
  contas_bancarias: { module: "financeiro", submoduleLabel: "Conta bancária", entityNoun: "conta bancária" },
  categorias: { module: "financeiro", submoduleLabel: "Categoria", entityNoun: "categoria" },
  centros_custo: { module: "financeiro", submoduleLabel: "Centro de custo", entityNoun: "centro de custo" },
  orcamento: { module: "financeiro", submoduleLabel: "Orçamento", entityNoun: "orçamento" },
  maintenance_contracts: { module: "financeiro", submoduleLabel: "Contrato", entityNoun: "contrato" },
  clientes: { module: "financeiro", submoduleLabel: "Cliente", entityNoun: "cliente" },
  fornecedores: { module: "financeiro", submoduleLabel: "Fornecedor", entityNoun: "fornecedor" },
  colaboradores: { module: "financeiro", submoduleLabel: "Colaborador", entityNoun: "colaborador" },
  // Admin
  profiles: { module: "admin", submoduleLabel: "Usuário", entityNoun: "usuário" },
  cargos: { module: "admin", submoduleLabel: "Cargo", entityNoun: "cargo" },
  cargo_permissoes: { module: "admin", submoduleLabel: "Permissão", entityNoun: "permissão" },
  usuario_cargos: { module: "admin", submoduleLabel: "Vínculo de cargo", entityNoun: "vínculo" },
  // Auth
  auth: { module: "admin", submoduleLabel: "Autenticação", entityNoun: "acesso" },
};

export function resolveModule(entityType: string | null | undefined): { module: AuditModule; submoduleLabel: string; entityNoun: string } {
  if (!entityType) return { module: "outros", submoduleLabel: "Sistema", entityNoun: "registro" };
  return ENTITY_TO_MODULE[entityType] ?? { module: "outros", submoduleLabel: entityType, entityNoun: "registro" };
}

const FIELD_LABELS: Record<string, string> = {
  title: "Título", name: "Nome", description: "Descrição", notes: "Observações",
  status: "Status", stage: "Estágio",
  owner_actor_id: "Responsável", contact_person_id: "Contato", company_id: "Empresa",
  estimated_value: "Valor estimado", estimated_mrr_value: "Mensalidade estimada",
  estimated_implementation_value: "Valor de implementação",
  probability_pct: "Probabilidade", expected_close_date: "Data prevista de fechamento",
  next_step: "Próximo passo", next_step_date: "Data do próximo passo",
  pain_description: "Dor identificada", pain_category: "Categoria da dor", pain_categories: "Categorias da dor",
  pain_cost_brl_monthly: "Custo da dor (mensal)", pain_hours_monthly: "Horas da dor (mensal)",
  scope_in: "Escopo incluído", scope_out: "Escopo excluído", scope_summary: "Escopo", scope_bullets: "Resumo do escopo (bullets)",
  budget_range_min: "Orçamento mínimo", budget_range_max: "Orçamento máximo",
  estimated_hours_total: "Horas estimadas", estimated_complexity: "Complexidade",
  decision_makers: "Decisores", competitors: "Concorrentes",
  current_solution: "Solução atual", business_context: "Contexto comercial",
  lost_reason: "Motivo da perda", closed_at: "Fechado em",
  project_type: "Tipo de projeto", project_type_v2: "Tipo de projeto",
  valor_previsto: "Valor previsto", valor_realizado: "Valor realizado",
  data_vencimento: "Vencimento", data_pagamento: "Pagamento", data_competencia: "Competência",
  conta_bancaria_id: "Conta bancária", categoria_id: "Categoria",
  fornecedor_id: "Fornecedor", cliente_id: "Cliente", projeto_id: "Projeto",
  conciliado: "Conciliado",
  contract_value: "Valor do contrato", start_date: "Início", end_date: "Término",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const HIDDEN_FIELDS = new Set([
  "id", "organization_id", "created_at", "updated_at", "updated_by", "created_by",
  "stage_changed_at", "deleted_at", "code", "updated_by_actor_id", "created_by_actor_id",
]);

export function isMeaningfulField(field: string): boolean {
  return !HIDDEN_FIELDS.has(field);
}

const ENUM_LABELS: Record<string, string> = {
  presencial_agendada: "Reunião agendada",
  reuniao_realizada: "Reunião realizada",
  proposta_enviada: "Proposta enviada",
  em_negociacao: "Em negociação",
  fechado_ganho: "Fechado ganho",
  fechado_perdido: "Fechado perdido",
  novo: "Novo", qualificando: "Qualificando", qualificado: "Qualificado",
  desqualificado: "Desqualificado", convertido: "Convertido",
  software_sob_medida: "Software sob medida", saas: "SaaS",
  consultoria: "Consultoria", manutencao: "Manutenção", outro: "Outro",
  pendente: "Pendente", pago: "Pago", recebido: "Recebido", cancelado: "Cancelado",
  receita: "Receita", despesa: "Despesa",
  baixa: "Baixa", media: "Média", alta: "Alta",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function formatValue(value: any, fieldName?: string): string {
  if (value === null || value === undefined || value === "") return "(vazio)";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") {
    if (fieldName && /value|valor|cost|budget|fee|salary|salario|mrr|implementation/i.test(fieldName)) {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
    }
    if (fieldName && /pct|percent|percentage|probability/i.test(fieldName)) return `${value}%`;
    return String(value);
  }
  if (typeof value === "string") {
    if (ENUM_LABELS[value]) return ENUM_LABELS[value];
    if (UUID_RE.test(value)) return "(referência)";
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      try { const d = new Date(value); if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR"); } catch {}
    }
    return value.length > 80 ? value.slice(0, 77) + "…" : value;
  }
  if (Array.isArray(value)) return value.length === 0 ? "(vazio)" : `${value.length} item(ns)`;
  if (typeof value === "object") return "(detalhes)";
  return String(value);
}

export function actionVerb(action: AuditAction, entityNoun: string): string {
  switch (action) {
    case "create": return `criou ${article(entityNoun)} ${entityNoun}`;
    case "update": return `alterou ${article(entityNoun)} ${entityNoun}`;
    case "delete": return `removeu ${article(entityNoun)} ${entityNoun}`;
    case "status_change": return `mudou o status d${article(entityNoun)} ${entityNoun}`;
    case "login": return `entrou no sistema`;
    default: return `fez uma ação em ${article(entityNoun)} ${entityNoun}`;
  }
}

function article(noun: string): string {
  // simple pt-BR heuristic
  const feminineEndings = ["a", "ade"];
  const last = noun.toLowerCase().slice(-1);
  return feminineEndings.includes(last) ? "a" : "o";
}

export const ACTION_COLORS: Record<AuditAction, string> = {
  create: "bg-emerald-500",
  update: "bg-amber-500",
  delete: "bg-red-500",
  status_change: "bg-sky-500",
  login: "bg-violet-500",
  other: "bg-muted-foreground",
};

export const ACTION_LEGEND: { action: AuditAction; label: string }[] = [
  { action: "create", label: "Criação" },
  { action: "update", label: "Alteração" },
  { action: "status_change", label: "Mudança de status" },
  { action: "delete", label: "Exclusão" },
  { action: "login", label: "Acesso ao sistema" },
];

export const MODULE_LABEL: Record<AuditModule, string> = {
  crm: "CRM", projetos: "Projetos", financeiro: "Financeiro",
  admin: "Admin", configuracoes: "Configurações", outros: "Outros",
};

export const MODULE_BADGE: Record<AuditModule, string> = {
  crm:           "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  projetos:      "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  financeiro:    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  admin:         "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  configuracoes: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
  outros:        "bg-muted text-muted-foreground border-border",
};

export function normalizeAction(action: string): AuditAction {
  const a = action.toLowerCase();
  if (a === "create" || a === "insert") return "create";
  if (a === "update") return "update";
  if (a === "delete") return "delete";
  if (a === "status_change") return "status_change";
  if (a === "login") return "login";
  return "other";
}

// Diff calculator: handles { from, to } and { new_data, old_data }
export type FieldDiff = { from: any; to: any };

export function diffChanges(changes: any): Record<string, FieldDiff> {
  if (!changes || typeof changes !== "object") return {};
  const out: Record<string, FieldDiff> = {};

  if ("new_data" in changes || "old_data" in changes) {
    const newData = changes.new_data ?? {};
    const oldData = changes.old_data ?? {};
    const keys = new Set([...Object.keys(newData ?? {}), ...Object.keys(oldData ?? {})]);
    for (const k of keys) {
      if (!isMeaningfulField(k)) continue;
      const a = oldData?.[k];
      const b = newData?.[k];
      if (JSON.stringify(a) !== JSON.stringify(b)) out[k] = { from: a, to: b };
    }
    return out;
  }

  for (const [k, v] of Object.entries(changes)) {
    if (!isMeaningfulField(k)) continue;
    if (v && typeof v === "object" && ("from" in (v as any) || "to" in (v as any))) {
      out[k] = { from: (v as any).from, to: (v as any).to };
    } else {
      out[k] = { from: undefined, to: v };
    }
  }
  return out;
}

// Build a one-line natural sentence from a diff
export function describeDiff(diff: Record<string, FieldDiff>): string | null {
  const keys = Object.keys(diff);
  if (keys.length === 0) return null;
  if (keys.length === 1) {
    const k = keys[0];
    const { from, to } = diff[k];
    return `Mudou ${fieldLabel(k)} de ${formatValue(from, k)} para ${formatValue(to, k)}`;
  }
  if (keys.length <= 3) {
    return `Alterou ${keys.map((k) => fieldLabel(k)).join(", ")}`;
  }
  return `Atualizou ${keys.length} campos`;
}

export function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "agora há pouco";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `há ${days} dia${days > 1 ? "s" : ""}`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function sourceLabel(metadata: any, source: "audit_logs" | "system_audit_logs", hasActor: boolean): string {
  const src = metadata?.source;
  if (source === "system_audit_logs") return "Ação administrativa";
  if (src === "crm_audit_trigger") return hasActor ? "Edição manual" : "Gatilho automático do sistema";
  if (src === "lead_conversion") return "Conversão de lead em deal";
  if (src === "project_creation") return "Criação automática a partir de deal";
  return hasActor ? "Edição manual" : "Sistema";
}
