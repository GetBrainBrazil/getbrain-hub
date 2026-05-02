import type { ActivityType } from '@/types/crm';

/**
 * Cores padronizadas por tipo de atividade do CRM.
 * Usa tokens semânticos do design system — nada de hex direto.
 */
export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  reuniao_presencial: 'Reunião presencial',
  reuniao_virtual: 'Reunião virtual',
  ligacao: 'Ligação',
  email: 'Email',
  whatsapp: 'WhatsApp',
  outro: 'Outro',
};

export const ACTIVITY_TYPE_SHORT: Record<ActivityType, string> = {
  reuniao_presencial: 'Reunião pres.',
  reuniao_virtual: 'Reunião virt.',
  ligacao: 'Ligação',
  email: 'Email',
  whatsapp: 'WhatsApp',
  outro: 'Outro',
};

/** Classes Tailwind para borda esquerda + bg leve do bloco. */
export const ACTIVITY_TYPE_STYLES: Record<ActivityType, { border: string; bg: string; dot: string; text: string }> = {
  reuniao_virtual: { border: 'border-l-accent', bg: 'bg-accent/5', dot: 'bg-accent', text: 'text-accent' },
  reuniao_presencial: { border: 'border-l-primary', bg: 'bg-primary/5', dot: 'bg-primary', text: 'text-primary' },
  ligacao: { border: 'border-l-warning', bg: 'bg-warning/5', dot: 'bg-warning', text: 'text-warning' },
  email: { border: 'border-l-muted-foreground', bg: 'bg-muted/30', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
  whatsapp: { border: 'border-l-success', bg: 'bg-success/5', dot: 'bg-success', text: 'text-success' },
  outro: { border: 'border-l-border', bg: 'bg-card', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
};

export const STATUS_BADGE_STYLES = {
  realizadas: 'border-success/30 bg-success/10 text-success',
  atrasadas: 'border-destructive/30 bg-destructive/10 text-destructive',
  agendadas: 'border-accent/30 bg-accent/10 text-accent',
} as const;

export const STATUS_LABEL = {
  realizadas: 'Feita',
  atrasadas: 'Atrasada',
  agendadas: 'Agendada',
} as const;

export type ActivityStatus = keyof typeof STATUS_LABEL;
