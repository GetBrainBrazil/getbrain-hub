import type { ActivityType, DealStage } from '@/types/crm';

export const DEAL_STAGES: DealStage[] = ['presencial_agendada', 'presencial_feita', 'orcamento_enviado', 'em_negociacao', 'fechado_ganho', 'fechado_perdido'];

export const DEAL_STAGE_PROBABILITY: Record<DealStage, number> = {
  presencial_agendada: 20,
  presencial_feita: 40,
  orcamento_enviado: 60,
  em_negociacao: 75,
  fechado_ganho: 100,
  fechado_perdido: 0,
};

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  presencial_agendada: 'Reunião Agendada',
  presencial_feita: 'Reunião Realizada',
  orcamento_enviado: 'Orçamento Enviado',
  em_negociacao: 'Em Negociação',
  fechado_ganho: 'Ganho',
  fechado_perdido: 'Perdido',
};

export const DEAL_STAGE_TONE: Record<DealStage, string> = {
  presencial_agendada: 'border-l-accent',
  presencial_feita: 'border-l-chart-5',
  orcamento_enviado: 'border-l-warning',
  em_negociacao: 'border-l-chart-4',
  fechado_ganho: 'border-l-success',
  fechado_perdido: 'border-l-muted-foreground',
};

export const DEAL_STAGE_BAR: Record<DealStage, string> = {
  presencial_agendada: 'bg-accent',
  presencial_feita: 'bg-chart-5',
  orcamento_enviado: 'bg-warning',
  em_negociacao: 'bg-chart-4',
  fechado_ganho: 'bg-success',
  fechado_perdido: 'bg-muted-foreground',
};

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
