/**
 * Tipos compartilhados de domínio que não vêm direto do schema gerado.
 * Para tipos de tabelas, prefira `Database["public"]["Tables"][...]` em
 * `@/integrations/supabase/types`.
 */

import type { ProjectStatus } from "@/lib/projetos-helpers";

export type NextMilestone = {
  id: string;
  title: string;
  target_date: string | null;
  status: string;
};

/**
 * Espelho da view SQL `public.project_metrics`.
 *
 * Atualizar este tipo quando colunas forem adicionadas/removidas na view.
 * Ver migration de criação da view e Seção 13 do ARCHITECTURE.md.
 */
export type ProjectMetrics = {
  project_id: string;
  project_code: string;

  // Financeiro
  revenue_contracted: number;
  revenue_received: number;
  revenue_pending: number;
  cost_integrations_monthly: number;
  cost_total_estimated: number;
  margin_real: number;

  // Tarefas (placeholder)
  tasks_total: number;
  tasks_done: number;
  tasks_in_progress: number;
  tasks_blocked: number;
  tasks_backlog: number;
  hours_estimated: number;
  hours_actual: number;
  tasks_completion_percent: number;

  // Marcos
  milestones_done: number;
  milestones_total: number;
  next_milestone: NextMilestone | null;

  // Dependências
  blocking_dependencies: number;
  total_dependencies: number;

  // Riscos
  high_risks_active: number;
  total_risks: number;

  // Integrações
  integrations_total: number;
  integrations_active: number;

  // Suporte (placeholder)
  tickets_open: number;
  tickets_resolved_30d: number;
  avg_resolution_hours: number;

  // Tokens (placeholder de consumo, budget é real)
  tokens_consumed_month_brl: number;
  tokens_budget_brl: number;
  tokens_consumption_percent: number;

  // Time
  actors_allocated: number;

  // Metadados
  estimated_delivery_date: string | null;
  start_date: string | null;
  project_status: ProjectStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
