import type { CompanyClientType, CompanyRevenueRange } from '@/types/crm';

export const CLIENT_TYPE_LABEL: Record<CompanyClientType, string> = {
  b2b: 'B2B',
  b2c: 'B2C',
  b2b_b2c: 'Híbrido',
};

export const CLIENT_TYPE_DESCRIPTION: Record<CompanyClientType, string> = {
  b2b: 'Vende para outras empresas',
  b2c: 'Vende para o consumidor final',
  b2b_b2c: 'Vende para empresas e pessoas',
};

export const CLIENT_TYPE_OPTIONS: CompanyClientType[] = ['b2b', 'b2c', 'b2b_b2c'];

export const CLIENT_TYPE_COLOR: Record<CompanyClientType, { active: string; idle: string; descActive: string }> = {
  b2b: {
    active: 'border-accent bg-accent text-accent-foreground shadow-sm ring-2 ring-accent/40 ring-offset-1 ring-offset-background',
    idle: 'border-border bg-muted/10 text-foreground hover:border-accent/50 hover:bg-accent/10',
    descActive: 'text-accent-foreground/80',
  },
  b2c: {
    active: 'border-success bg-success text-success-foreground shadow-sm ring-2 ring-success/40 ring-offset-1 ring-offset-background',
    idle: 'border-border bg-muted/10 text-foreground hover:border-success/50 hover:bg-success/10',
    descActive: 'text-success-foreground/80',
  },
  b2b_b2c: {
    active: 'border-warning bg-warning text-warning-foreground shadow-sm ring-2 ring-warning/40 ring-offset-1 ring-offset-background',
    idle: 'border-border bg-muted/10 text-foreground hover:border-warning/50 hover:bg-warning/10',
    descActive: 'text-warning-foreground/80',
  },
};

export const REVENUE_RANGE_LABEL: Record<CompanyRevenueRange, string> = {
  ate_360k: 'Até R$ 360k (MEI/ME)',
  de_360k_a_4_8m: 'R$ 360k – 4,8M (EPP)',
  de_4_8m_a_30m: 'R$ 4,8M – 30M',
  acima_30m: 'Acima de R$ 30M',
};

export const REVENUE_RANGE_OPTIONS: CompanyRevenueRange[] = [
  'ate_360k', 'de_360k_a_4_8m', 'de_4_8m_a_30m', 'acima_30m',
];

export const DIGITAL_MATURITY_LABEL: Record<number, string> = {
  1: 'Inicial',
  2: 'Básica',
  3: 'Intermediária',
  4: 'Avançada',
  5: 'Líder digital',
};

export const DIGITAL_MATURITY_DESCRIPTION: Record<number, string> = {
  1: 'Processos manuais, pouco ou nenhum sistema',
  2: 'Usa planilhas e ferramentas isoladas',
  3: 'Tem sistemas, mas pouco integrados',
  4: 'Sistemas integrados e automações ativas',
  5: 'Cultura data-driven, IA e automação avançada',
};
