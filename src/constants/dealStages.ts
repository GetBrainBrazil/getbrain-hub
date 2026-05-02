import type { ActivityType, DealStage } from '@/types/crm';

/**
 * Estágios oficiais do funil (ordem de exibição no Kanban).
 *
 * NOTA: o slug `gelado` foi reaproveitado como o estágio "Negociação",
 * posicionado entre "Proposta Enviada" e "Convertido", para evitar
 * migration do enum no banco. Cards antigos marcados como `gelado`
 * passam a aparecer como "Negociação".
 *
 * `com_interesse` (NOVO): cliente clicou em "Quero avançar" na proposta
 * pública. Move automaticamente do estágio anterior para este.
 */
export const DEAL_STAGES: DealStage[] = [
  'descoberta_marcada',
  'descobrindo',
  'proposta_na_mesa',
  'ajustando',
  'gelado',
  'com_interesse',
  'ganho',
  'perdido',
];

export const DEAL_STAGE_PROBABILITY: Record<DealStage, number> = {
  descoberta_marcada: 10,
  descobrindo: 25,
  proposta_na_mesa: 50,
  ajustando: 70,
  gelado: 60,
  com_interesse: 85,
  ganho: 100,
  perdido: 0,
};

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  descoberta_marcada: 'Novo Lead',
  descobrindo: 'Primeiro Contato',
  proposta_na_mesa: 'Qualificado',
  ajustando: 'Proposta Enviada',
  gelado: 'Negociação',
  com_interesse: 'Com Interesse',
  ganho: 'Convertido',
  perdido: 'Perdido',
};

/** Borda lateral esquerda usada nos cards / colunas. */
export const DEAL_STAGE_TONE: Record<DealStage, string> = {
  descoberta_marcada: 'border-l-accent',
  descobrindo: 'border-l-warning',
  proposta_na_mesa: 'border-l-chart-orange',
  ajustando: 'border-l-chart-5',
  gelado: 'border-l-chart-2',
  com_interesse: 'border-l-success',
  ganho: 'border-l-success',
  perdido: 'border-l-destructive',
};

/** Faixa/barra cheia (ex: top da coluna). */
export const DEAL_STAGE_BAR: Record<DealStage, string> = {
  descoberta_marcada: 'bg-accent',
  descobrindo: 'bg-warning',
  proposta_na_mesa: 'bg-chart-orange',
  ajustando: 'bg-chart-5',
  gelado: 'bg-chart-2',
  com_interesse: 'bg-success',
  ganho: 'bg-success',
  perdido: 'bg-destructive',
};

/** Bolinha colorida no header da coluna (Kanban). */
export const DEAL_STAGE_DOT: Record<DealStage, string> = {
  descoberta_marcada: 'bg-accent',
  descobrindo: 'bg-warning',
  proposta_na_mesa: 'bg-chart-orange',
  ajustando: 'bg-chart-5',
  gelado: 'bg-chart-2',
  com_interesse: 'bg-success',
  ganho: 'bg-success',
  perdido: 'bg-destructive',
};

/** Cor do texto do nome (matching com o dot, mais sutil). */
export const DEAL_STAGE_TEXT: Record<DealStage, string> = {
  descoberta_marcada: 'text-accent',
  descobrindo: 'text-warning',
  proposta_na_mesa: 'text-chart-orange',
  ajustando: 'text-chart-5',
  gelado: 'text-chart-2',
  com_interesse: 'text-success',
  ganho: 'text-success',
  perdido: 'text-destructive',
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
