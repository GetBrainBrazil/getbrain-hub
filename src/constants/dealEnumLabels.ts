import type {
  DealPainCategory,
  EstimationConfidence,
  DealDependencyType,
  DealDependencyStatus,
  ContactRole,
} from '@/types/crm';

export const PAIN_CATEGORY_LABEL: Record<DealPainCategory, string> = {
  operacional: 'Operacional',
  comercial: 'Comercial',
  estrategica: 'Estratégica',
  compliance: 'Compliance / Legal',
  experiencia: 'Experiência do cliente',
  outra: 'Outra',
};
export const PAIN_CATEGORY_OPTIONS: DealPainCategory[] = [
  'operacional', 'comercial', 'estrategica', 'compliance', 'experiencia', 'outra',
];
export const PAIN_CATEGORY_COLOR: Record<DealPainCategory, string> = {
  operacional: 'bg-chart-4/15 text-chart-4 border-chart-4/30',
  comercial: 'bg-success/15 text-success border-success/30',
  estrategica: 'bg-accent/15 text-accent border-accent/30',
  compliance: 'bg-warning/15 text-warning border-warning/30',
  experiencia: 'bg-chart-5/15 text-chart-5 border-chart-5/30',
  outra: 'bg-muted text-muted-foreground border-border',
};

// PROJECT_TYPE_V2 — agora é dinâmico via crm_project_types.
// Use o hook useCrmProjectTypes para listar/labels/cores.

export const ESTIMATION_CONFIDENCE_LABEL: Record<EstimationConfidence, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};
export const ESTIMATION_CONFIDENCE_OPTIONS: EstimationConfidence[] = ['alta', 'media', 'baixa'];
export const ESTIMATION_CONFIDENCE_COLOR: Record<EstimationConfidence, string> = {
  alta: 'bg-success/15 text-success border-success/30',
  media: 'bg-warning/15 text-warning border-warning/30',
  baixa: 'bg-destructive/15 text-destructive border-destructive/30',
};

export const DEPENDENCY_TYPE_LABEL: Record<DealDependencyType, string> = {
  acesso_sistema: 'Acesso a sistema',
  dado: 'Dado / informação',
  pessoa: 'Pessoa / decisor',
  hardware: 'Hardware / equipamento',
  autorizacao_legal: 'Autorização legal',
  outro: 'Outro',
};
export const DEPENDENCY_TYPE_OPTIONS: DealDependencyType[] = [
  'acesso_sistema', 'dado', 'pessoa', 'hardware', 'autorizacao_legal', 'outro',
];
export const DEPENDENCY_TYPE_COLOR: Record<DealDependencyType, string> = {
  acesso_sistema: 'bg-accent/15 text-accent border-accent/30',
  dado: 'bg-chart-5/15 text-chart-5 border-chart-5/30',
  pessoa: 'bg-warning/15 text-warning border-warning/30',
  hardware: 'bg-chart-4/15 text-chart-4 border-chart-4/30',
  autorizacao_legal: 'bg-destructive/15 text-destructive border-destructive/30',
  outro: 'bg-muted text-muted-foreground border-border',
};

export const DEPENDENCY_STATUS_LABEL: Record<DealDependencyStatus, string> = {
  aguardando_combinar: 'Aguardando combinar',
  combinado: 'Combinado',
  liberado: 'Liberado',
  atrasado: 'Atrasado',
};
export const DEPENDENCY_STATUS_OPTIONS: DealDependencyStatus[] = [
  'aguardando_combinar', 'combinado', 'liberado', 'atrasado',
];
export const DEPENDENCY_STATUS_COLOR: Record<DealDependencyStatus, string> = {
  aguardando_combinar: 'bg-muted text-muted-foreground border-border',
  combinado: 'bg-accent/15 text-accent border-accent/30',
  liberado: 'bg-success/15 text-success border-success/30',
  atrasado: 'bg-destructive/15 text-destructive border-destructive/30',
};

export const CONTACT_ROLE_LABEL: Record<ContactRole, string> = {
  decisor: 'Decisor',
  usuario_final: 'Usuário final',
  tecnico: 'Técnico',
  financeiro: 'Financeiro',
  outro: 'Outro',
};

export const COMPLEXITY_LABEL: Record<number, string> = {
  1: 'Trivial',
  2: 'Simples',
  3: 'Médio',
  4: 'Complexo',
  5: 'Muito complexo',
};
