export type CompanyRelationshipStatus = 'prospect' | 'lead' | 'active_client' | 'former_client' | 'lost';
export type LeadStatus = 'novo' | 'triagem_agendada' | 'triagem_feita' | 'descartado' | 'convertido';
export type DealStage = 'presencial_agendada' | 'presencial_feita' | 'orcamento_enviado' | 'em_negociacao' | 'fechado_ganho' | 'fechado_perdido';
export type ActivityType = 'reuniao_presencial' | 'reuniao_virtual' | 'ligacao' | 'email' | 'whatsapp' | 'outro';

export interface CrmCompany { id: string; legal_name: string; trade_name: string | null; relationship_status?: CompanyRelationshipStatus; }
export interface CrmPerson { id: string; full_name: string; email: string | null; phone?: string | null; role_in_company?: string | null; }
export interface CrmActor { id: string; display_name: string; avatar_url?: string | null; }

export interface Lead {
  id: string; code: string; title: string; company_id: string; contact_person_id: string | null; owner_actor_id: string | null;
  status: LeadStatus; source: string | null; estimated_value: number | null; pain_description: string | null; notes: string | null;
  triagem_scheduled_at: string | null; triagem_happened_at: string | null; lost_reason: string | null; converted_to_deal_id: string | null; converted_at: string | null;
  company?: CrmCompany | null; contact?: CrmPerson | null; owner?: CrmActor | null;
}

export interface Deal {
  id: string; code: string; title: string; company_id: string; contact_person_id: string | null; owner_actor_id: string | null; origin_lead_id: string | null;
  stage: DealStage; estimated_value: number | null; probability_pct: number; expected_close_date: string | null; project_type: string | null;
  scope_summary: string | null; proposal_url: string | null; notes: string | null; stage_changed_at: string; closed_at: string | null; lost_reason: string | null; generated_project_id: string | null;
  company?: CrmCompany | null; contact?: CrmPerson | null; owner?: CrmActor | null; origin_source?: string | null; last_activity?: DealActivity | null;
}

export interface DealActivity {
  id: string; deal_id: string | null; lead_id: string | null; type: ActivityType; title: string; description: string | null;
  scheduled_at: string | null; happened_at: string | null; duration_minutes: number | null; outcome: string | null; owner_actor_id: string | null; participants: string[];
}

export interface CrmFilters { ownerIds: string[]; sourceIds: string[]; valueRange: [number, number] | null; search: string; }
export interface CrmMetrics { leads_novos: number; leads_triagem_agendada: number; leads_triagem_feita: number; leads_descartados: number; leads_convertidos: number; deals_ativos: number; pipeline_total_brl: number; forecast_ponderado_brl: number; deals_ganhos_total: number; deals_perdidos_total: number; receita_ganha_total_brl: number; conversion_rate_pct: number; ticket_medio_brl: number; }
