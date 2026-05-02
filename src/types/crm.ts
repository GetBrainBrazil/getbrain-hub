export type CompanyRelationshipStatus = 'prospect' | 'lead' | 'active_client' | 'former_client' | 'lost';
export type LeadStatus = 'novo' | 'triagem_agendada' | 'triagem_feita' | 'descartado' | 'convertido';
export type DealStage =
  | 'descoberta_marcada'
  | 'descobrindo'
  | 'proposta_na_mesa'
  | 'ajustando'
  | 'com_interesse'
  | 'ganho'
  | 'perdido'
  | 'gelado';
export type ActivityType = 'reuniao_presencial' | 'reuniao_virtual' | 'ligacao' | 'email' | 'whatsapp' | 'outro';

// v2.1 — slugs vêm de crm_project_types (dinâmico). Mantém type como string
// p/ compat com slugs antigos (whatsapp_chatbot, ai_sdr, etc.).
export type DealProjectType = string;

// Dynamic — slugs vêm de crm_pain_categories. Mantemos o type como string
// (slugs do sistema antigo continuam válidos: operacional, comercial, etc.)
export type DealPainCategory = string;

export type EstimationConfidence = 'alta' | 'media' | 'baixa';

export type DealDependencyType =
  | 'acesso_sistema' | 'dado' | 'pessoa'
  | 'hardware' | 'autorizacao_legal' | 'outro';

export type DealDependencyStatus =
  | 'aguardando_combinar' | 'combinado' | 'liberado' | 'atrasado';

export type DealDependencyPriority = 'baixa' | 'media' | 'alta' | 'critica';

export type CompanyClientType = 'b2b' | 'b2c' | 'b2b_b2c';
export type CompanyRevenueRange = 'ate_360k' | 'de_360k_a_4_8m' | 'de_4_8m_a_30m' | 'acima_30m';
export type ContactRole = 'decisor' | 'usuario_final' | 'tecnico' | 'financeiro' | 'outro';

export interface DealDependency {
  id: string;
  deal_id: string;
  organization_id: string;
  dependency_type: DealDependencyType;
  description: string;
  responsible_person_name: string | null;
  responsible_person_role: string | null;
  responsible_email: string | null;
  responsible_phone: string | null;
  agreed_deadline: string | null;
  requested_at: string | null;
  status: DealDependencyStatus;
  priority: DealDependencyPriority;
  is_blocker: boolean;
  internal_owner_actor_id: string | null;
  impact_if_missing: string | null;
  links: string[];
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContactRoleRef {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface CompanyContactRole {
  id: string;
  company_person_id: string;
  organization_id: string;
  role_id: string;
  /** Slug legacy (mantido para compat — pode ser null para papéis customizados) */
  role: ContactRole | null;
  /** Catálogo embarcado via join */
  role_ref?: ContactRoleRef | null;
  created_at?: string;
}

// AcceptanceCriterion compartilhado com projects/tasks (mesma forma JSONB)
export type { AcceptanceCriterion } from "./shared";
import type { AcceptanceCriterion } from "./shared";

export interface CrmCompany { id: string; legal_name: string; trade_name: string | null; relationship_status?: CompanyRelationshipStatus; }
export interface CrmPerson { id: string; full_name: string; email: string | null; phone?: string | null; role_in_company?: string | null; }
export interface CrmActor { id: string; display_name: string; avatar_url?: string | null; }

export interface Lead {
  id: string; code: string; title: string; company_id: string; contact_person_id: string | null; owner_actor_id: string | null;
  status: LeadStatus; source: string | null; estimated_value: number | null; pain_description: string | null; notes: string | null;
  triagem_scheduled_at: string | null; triagem_happened_at: string | null; lost_reason: string | null; converted_to_deal_id: string | null; converted_at: string | null;
  // triagem (que se mantém — define se vira Deal ou não)
  triagem_summary: string | null;
  triagem_channel: string | null;
  triagem_duration_minutes: number | null;
  created_at?: string; company?: CrmCompany | null; contact?: CrmPerson | null; owner?: CrmActor | null; converted_deal_code?: string | null;
}

export interface Deal {
  id: string; code: string; title: string; company_id: string; contact_person_id: string | null; owner_actor_id: string | null; origin_lead_id: string | null;
  stage: DealStage; estimated_value: number | null; estimated_implementation_value: number | null; estimated_mrr_value: number | null; probability_pct: number; expected_close_date: string | null;
  project_type: string | null;          // legacy enum (compartilhado com projects)
  project_type_v2: string[];                // v2.2 — slugs em crm_project_types (multi)
  scope_summary: string | null; proposal_url: string | null; notes: string | null; stage_changed_at: string; closed_at: string | null; lost_reason: string | null; generated_project_id: string | null;

  // v2.0 — descoberta enxuta
  business_context: string | null;
  scope_in: string | null;
  scope_out: string | null;
  scope_bullets: string[];
  acceptance_criteria: AcceptanceCriterion[];
  deliverables: string[];
  premises: string[];
  identified_risks: string[];
  technical_stack: string[];

  // Dor estruturada
  pain_category: DealPainCategory | null;        // legado (1 categoria) — manter por compat
  pain_categories: string[];                      // v2.1 — múltiplas categorias
  pain_description: string | null;
  pain_cost_brl_monthly: number | null;
  pain_hours_monthly: number | null;
  current_solution: string | null;

  // Estimativa grossa
  estimated_hours_total: number | null;
  estimated_complexity: number | null;
  estimation_confidence: EstimationConfidence | null;

  // Anexos comerciais (Hub Comercial — Fase 1)
  organograma_url: string | null;
  mockup_url: string | null;
  mockup_screenshots: string[];

  // Comercial
  budget_range_min: number | null;
  budget_range_max: number | null;
  pricing_rationale: string | null;
  decision_makers: string | null;
  competitors: string | null;
  next_step: string | null;
  next_step_date: string | null;
  desired_start_date: string | null;
  desired_delivery_date: string | null;

  // v2.3 — desconto, custos extras, MRR detalhado
  discount_amount: number | null;
  discount_kind: 'percent' | 'fixed' | null;
  discount_valid_until: string | null;
  discount_notes: string | null;
  extra_costs: Array<{ description: string; amount: number; recurrence: 'once' | 'monthly' | 'yearly'; notes?: string | null }>;
  mrr_start_date: string | null;
  mrr_duration_months: number | null;
  mrr_discount_months: number | null;
  mrr_discount_value: number | null;

  // v2.4 — parcelamento + gatilhos do MRR
  installments_count: number | null;
  first_installment_date: string | null;
  mrr_start_trigger: 'on_delivery' | 'before_delivery' | null;
  mrr_discount_kind: 'months' | 'until_date' | 'until_stage' | null;
  mrr_discount_until_date: string | null;
  mrr_discount_until_stage: string | null;

  created_at?: string; company?: CrmCompany | null; contact?: CrmPerson | null; owner?: CrmActor | null; origin_source?: string | null; origin_code?: string | null; last_activity?: DealActivity | null;
}

export interface DealActivity {
  id: string; deal_id: string | null; lead_id: string | null; type: ActivityType; title: string; description: string | null;
  scheduled_at: string | null; happened_at: string | null; duration_minutes: number | null; outcome: string | null; owner_actor_id: string | null; participants: string[];
  deal_code?: string | null; lead_code?: string | null; owner?: CrmActor | null;
}

export interface CrmFilters { ownerIds: string[]; sourceIds: string[]; valueRange: [number, number] | null; search: string; }
export interface CrmMetrics { leads_novos: number; leads_triagem_agendada: number; leads_triagem_feita: number; leads_descartados: number; leads_convertidos: number; deals_ativos: number; pipeline_total_brl: number; forecast_ponderado_brl: number; deals_ganhos_total: number; deals_perdidos_total: number; receita_ganha_total_brl: number; conversion_rate_pct: number; ticket_medio_brl: number; }
