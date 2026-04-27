// Tipo de Project usado no front (subset de campos relevantes).
// Os 5 campos de escopo abaixo passaram a ser tipos estruturados na migração v1.9.
import type { AcceptanceCriterion } from "./shared";
import type { ProjectStatus, ProjectType } from "@/lib/projetos-helpers";

export type { AcceptanceCriterion };

export type Project = {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  project_type: ProjectType;
  company_id: string;
  contract_value: number | null;
  installments_count: number | null;
  start_date: string | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  description: string | null;
  notes: string | null;
  token_budget_brl: number | null;
  business_context: string | null;
  scope_in: string | null;
  scope_out: string | null;
  // Campos estruturados (v1.9)
  acceptance_criteria: AcceptanceCriterion[];
  deliverables: string[];
  premises: string[];
  identified_risks: string[];
  technical_stack: string[];
  created_at: string;
  updated_at: string;
};
