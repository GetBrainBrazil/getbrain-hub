import type { ActivityType, DealStage } from '@/types/crm';

/**
 * Estágios oficiais do funil (ordem de exibição no Kanban).
 * Ganho/Perdido/Gelado ficam no fim e podem ser ocultados em algumas visões.
 */
export const DEAL_STAGES: DealStage[] = [
  'descoberta_marcada',
  'descobrindo',
  'proposta_na_mesa',
  'ajustando',
  'ganho',
  'perdido',
  'gelado',
];

export const DEAL_STAGE_PROBABILITY: Record<DealStage, number> = {
  descoberta_marcada: 20,
  descobrindo: 40,
  proposta_na_mesa: 60,
  ajustando: 75,
  ganho: 100,
  perdido: 0,
  gelado: 10,
};

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  descoberta_marcada: 'Descoberta Marcada',
  descobrindo: 'Descobrindo',
  proposta_na_mesa: 'Proposta na Mesa',
  ajustando: 'Ajustando',
  ganho: 'Ganho',
  perdido: 'Perdido',
  gelado: 'Gelado',
};

export const DEAL_STAGE_TONE: Record<DealStage, string> = {
  descoberta_marcada: 'border-l-accent',
  descobrindo: 'border-l-chart-5',
  proposta_na_mesa: 'border-l-warning',
  ajustando: 'border-l-chart-4',
  ganho: 'border-l-success',
  perdido: 'border-l-muted-foreground',
  gelado: 'border-l-chart-2',
};

export const DEAL_STAGE_BAR: Record<DealStage, string> = {
  descoberta_marcada: 'bg-accent',
  descobrindo: 'bg-chart-5',
  proposta_na_mesa: 'bg-warning',
  ajustando: 'bg-chart-4',
  ganho: 'bg-success',
  perdido: 'bg-muted-foreground',
  gelado: 'bg-chart-2',
};

/**
 * Mapeamento defensivo para slugs antigos (mantidos no enum por retro-compat).
 * Use `normalizeDealStage(stage)` ao ler dados do banco antes de indexar
 * em qualquer um dos records acima.
 */
const LEGACY_STAGE_MAP: Record<string, DealStage> = {
  presencial_agendada: 'descoberta_marcada',
  presencial_feita: 'descobrindo',
  orcamento_enviado: 'proposta_na_mesa',
  em_negociacao: 'ajustando',
  fechado_ganho: 'ganho',
  fechado_perdido: 'perdido',
};

export function normalizeDealStage(stage: string | null | undefined): DealStage {
  if (!stage) return 'descoberta_marcada';
  return (LEGACY_STAGE_MAP[stage] ?? stage) as DealStage;
}

export const ACTIVITY_ICON: Record<ActivityType, string> = {
  reuniao_presencial: '🤝',
  reuniao_virtual: '💻',
  ligacao: '📞',
  email: '✉️',
  whatsapp: '💬',
  outro: '•',
};

export const PROJECT_TYPE_LABEL: Record<string, string> = {
  sistema_personalizado: 'Sistema',
  chatbot: 'Chatbot',
  consultoria: 'Consultoria',
  interno: 'Interno',
  outro: 'Outro',
};

export const PROJECT_TYPE_OPTIONS = Object.keys(PROJECT_TYPE_LABEL);
