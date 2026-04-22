// Helpers para o módulo de Escopo Estruturado de Projetos
// Inclui: tipos, opções de enum, classes de cor, label maps.

// ──────────── Tipos (refletem os enums do banco) ────────────
export type DependencyStatus =
  | "pendente"
  | "solicitado"
  | "em_andamento"
  | "recebido"
  | "atrasado"
  | "bloqueante"
  | "resolvido"
  | "cancelado";

export type DependencyType =
  | "acesso_api"
  | "credenciais"
  | "dados_cliente"
  | "aprovacao"
  | "documentacao"
  | "homologacao"
  | "infraestrutura"
  | "outro";

export type MilestoneStatus =
  | "planejado"
  | "em_andamento"
  | "concluido"
  | "atrasado"
  | "cancelado";

export type IntegrationStatus =
  | "planejada"
  | "em_desenvolvimento"
  | "testando"
  | "ativa"
  | "com_erro"
  | "descontinuada";

export type RiskSeverity = "baixa" | "media" | "alta" | "critica";
export type RiskProbability = "baixa" | "media" | "alta";
export type RiskStatus =
  | "identificado"
  | "em_mitigacao"
  | "mitigado"
  | "materializado"
  | "aceito";

// ──────────── Interfaces ────────────
export interface ProjectDependency {
  id: string;
  organization_id: string;
  project_id: string;
  title: string;
  description: string | null;
  dependency_type: DependencyType;
  status: DependencyStatus;
  requested_from: string | null;
  responsible_actor_id: string | null;
  requested_at: string | null;
  expected_at: string | null;
  received_at: string | null;
  is_blocking: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by_actor_id: string | null;
  updated_by_actor_id: string | null;
}

export interface ProjectMilestone {
  id: string;
  organization_id: string;
  project_id: string;
  title: string;
  description: string | null;
  sequence_order: number;
  target_date: string;
  actual_date: string | null;
  status: MilestoneStatus;
  acceptance_notes: string | null;
  triggers_billing: boolean;
  billing_amount: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by_actor_id: string | null;
  updated_by_actor_id: string | null;
}

export interface ProjectIntegration {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  provider: string | null;
  purpose: string | null;
  documentation_url: string | null;
  credentials_location: string | null;
  status: IntegrationStatus;
  estimated_cost_monthly_brl: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by_actor_id: string | null;
  updated_by_actor_id: string | null;
}

export interface ProjectRisk {
  id: string;
  organization_id: string;
  project_id: string;
  title: string;
  description: string | null;
  severity: RiskSeverity;
  probability: RiskProbability;
  status: RiskStatus;
  mitigation_plan: string | null;
  responsible_actor_id: string | null;
  identified_at: string;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by_actor_id: string | null;
  updated_by_actor_id: string | null;
}

// ──────────── Options ────────────
export const DEPENDENCY_TYPE_OPTIONS: { value: DependencyType; label: string }[] = [
  { value: "acesso_api", label: "Acesso a API" },
  { value: "credenciais", label: "Credenciais" },
  { value: "dados_cliente", label: "Dados do Cliente" },
  { value: "aprovacao", label: "Aprovação" },
  { value: "documentacao", label: "Documentação" },
  { value: "homologacao", label: "Homologação" },
  { value: "infraestrutura", label: "Infraestrutura" },
  { value: "outro", label: "Outro" },
];

export const DEPENDENCY_STATUS_OPTIONS: { value: DependencyStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "solicitado", label: "Solicitado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "recebido", label: "Recebido" },
  { value: "atrasado", label: "Atrasado" },
  { value: "bloqueante", label: "Bloqueante" },
  { value: "resolvido", label: "Resolvido" },
  { value: "cancelado", label: "Cancelado" },
];

export const MILESTONE_STATUS_OPTIONS: { value: MilestoneStatus; label: string }[] = [
  { value: "planejado", label: "Planejado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "atrasado", label: "Atrasado" },
  { value: "cancelado", label: "Cancelado" },
];

export const INTEGRATION_STATUS_OPTIONS: { value: IntegrationStatus; label: string }[] = [
  { value: "planejada", label: "Planejada" },
  { value: "em_desenvolvimento", label: "Em desenvolvimento" },
  { value: "testando", label: "Testando" },
  { value: "ativa", label: "Ativa" },
  { value: "com_erro", label: "Com erro" },
  { value: "descontinuada", label: "Descontinuada" },
];

export const RISK_SEVERITY_OPTIONS: { value: RiskSeverity; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];

export const RISK_PROBABILITY_OPTIONS: { value: RiskProbability; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

export const RISK_STATUS_OPTIONS: { value: RiskStatus; label: string }[] = [
  { value: "identificado", label: "Identificado" },
  { value: "em_mitigacao", label: "Em mitigação" },
  { value: "mitigado", label: "Mitigado" },
  { value: "materializado", label: "Materializado" },
  { value: "aceito", label: "Aceito" },
];

// ──────────── Label getters ────────────
export const dependencyTypeLabel = (v: DependencyType) =>
  DEPENDENCY_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v;
export const dependencyStatusLabel = (v: DependencyStatus) =>
  DEPENDENCY_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
export const milestoneStatusLabel = (v: MilestoneStatus) =>
  MILESTONE_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
export const integrationStatusLabel = (v: IntegrationStatus) =>
  INTEGRATION_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
export const riskSeverityLabel = (v: RiskSeverity) =>
  RISK_SEVERITY_OPTIONS.find((o) => o.value === v)?.label ?? v;
export const riskProbabilityLabel = (v: RiskProbability) =>
  RISK_PROBABILITY_OPTIONS.find((o) => o.value === v)?.label ?? v;
export const riskStatusLabel = (v: RiskStatus) =>
  RISK_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;

// ──────────── Cores (semantic tokens via cn) ────────────
// Cada classe usa apenas tokens semânticos do design system.
export function dependencyStatusClass(s: DependencyStatus): string {
  switch (s) {
    case "resolvido":
    case "recebido":
      return "bg-success/10 text-success border-success/30";
    case "em_andamento":
    case "solicitado":
      return "bg-warning/10 text-warning border-warning/30";
    case "atrasado":
    case "bloqueante":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "cancelado":
      return "bg-muted text-muted-foreground border-border";
    case "pendente":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function milestoneStatusClass(s: MilestoneStatus): string {
  switch (s) {
    case "concluido":
      return "bg-success/15 text-success border-success/30";
    case "em_andamento":
      return "bg-accent/15 text-accent border-accent/30";
    case "atrasado":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "cancelado":
      return "bg-muted text-muted-foreground border-border";
    case "planejado":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function integrationStatusClass(s: IntegrationStatus): string {
  switch (s) {
    case "ativa":
      return "bg-success/15 text-success border-success/30";
    case "testando":
    case "em_desenvolvimento":
      return "bg-warning/15 text-warning border-warning/30";
    case "com_erro":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "descontinuada":
      return "bg-muted text-muted-foreground border-border";
    case "planejada":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function riskSeverityClass(s: RiskSeverity): string {
  switch (s) {
    case "critica":
      return "bg-destructive/15 text-destructive border-destructive/40";
    case "alta":
      return "bg-orange-500/15 text-orange-500 border-orange-500/30";
    case "media":
      return "bg-warning/15 text-warning border-warning/30";
    case "baixa":
    default:
      return "bg-success/15 text-success border-success/30";
  }
}

export function riskProbabilityClass(s: RiskProbability): string {
  switch (s) {
    case "alta":
      return "bg-orange-500/15 text-orange-500 border-orange-500/30";
    case "media":
      return "bg-warning/15 text-warning border-warning/30";
    case "baixa":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function riskStatusClass(s: RiskStatus): string {
  switch (s) {
    case "mitigado":
      return "bg-success/15 text-success border-success/30";
    case "em_mitigacao":
      return "bg-warning/15 text-warning border-warning/30";
    case "materializado":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "aceito":
      return "bg-blue-500/15 text-blue-500 border-blue-500/30";
    case "identificado":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

// ──────────── Cell intensity para a matriz de riscos 3x4 ────────────
// Combina probabilidade × severidade em uma classe de fundo para cada célula.
export function riskMatrixCellClass(
  prob: RiskProbability,
  sev: RiskSeverity,
): string {
  const pScore = prob === "alta" ? 3 : prob === "media" ? 2 : 1;
  const sScore =
    sev === "critica" ? 4 : sev === "alta" ? 3 : sev === "media" ? 2 : 1;
  const total = pScore * sScore;
  if (total >= 9) return "bg-destructive/20 border-destructive/40 text-destructive";
  if (total >= 6) return "bg-orange-500/15 border-orange-500/30 text-orange-500";
  if (total >= 3) return "bg-warning/15 border-warning/30 text-warning";
  return "bg-success/10 border-success/30 text-success";
}

// ──────────── Status crítico (para banner e KPIs) ────────────
export const CRITICAL_DEP_STATUSES: DependencyStatus[] = [
  "pendente",
  "solicitado",
  "em_andamento",
  "atrasado",
  "bloqueante",
];

export function isCriticalBlocking(d: { is_blocking: boolean; status: DependencyStatus }) {
  return d.is_blocking && CRITICAL_DEP_STATUSES.includes(d.status);
}

export function diffDays(from: string | Date, to: string | Date): number {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
