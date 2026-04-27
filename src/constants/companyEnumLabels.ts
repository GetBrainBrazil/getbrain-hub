import type { CompanyClientType, CompanyRevenueRange } from '@/types/crm';

export const CLIENT_TYPE_LABEL: Record<CompanyClientType, string> = {
  b2b: 'B2B',
  b2c: 'B2C',
  b2b_b2c: 'B2B + B2C',
};

export const CLIENT_TYPE_OPTIONS: CompanyClientType[] = ['b2b', 'b2c', 'b2b_b2c'];

export const CLIENT_TYPE_COLOR: Record<CompanyClientType, string> = {
  b2b: 'bg-accent/15 text-accent border-accent/30',
  b2c: 'bg-success/15 text-success border-success/30',
  b2b_b2c: 'bg-chart-4/15 text-chart-4 border-chart-4/30',
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
