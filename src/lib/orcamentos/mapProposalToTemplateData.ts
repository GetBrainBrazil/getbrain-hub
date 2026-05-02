/**
 * Mapper que converte um `ProposalDetail` (shape do banco) no
 * `ProposalDataForTemplate` consumido pelos templates Web/PDF.
 *
 * Centralizado pra que ambos lados (preview no editor e geração definitiva)
 * partam exatamente do mesmo dado, evitando divergência visual.
 */

import type { ProposalDataForTemplate, ProposalItemForTemplate } from "@/types/proposal-template-props";
import { GETBRAIN_INFO } from "@/lib/getbrain-info";

interface RawProposal {
  code: string;
  client_company_name: string;
  client_city: string | null;
  client_logo_url: string | null;
  client_brand_color?: string | null;
  welcome_message?: string | null;
  executive_summary?: string | null;
  pain_context?: string | null;
  solution_overview?: string | null;
  considerations: unknown;
  maintenance_description: string | null;
  maintenance_monthly_value: number | null;
  implementation_days: number | null;
  validation_days: number | null;
  valid_until: string;
  mockup_url?: string | null;
  scope_items: unknown;
  title?: string | null;
}

function toItems(raw: unknown): ProposalItemForTemplate[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((it: any, idx) => {
    const qty = Number(it?.quantity ?? 1);
    const unit = Number(it?.unit_price ?? it?.value ?? 0);
    return {
      id: String(it?.id ?? idx),
      description: String(it?.title ?? it?.description ?? ""),
      quantity: qty,
      unit_price: unit,
      total: Number(it?.total ?? qty * unit),
      detailed_description: it?.detailed_description ?? it?.description ?? null,
      deliverables: Array.isArray(it?.deliverables) ? it.deliverables : [],
      acceptance_criteria: Array.isArray(it?.acceptance_criteria) ? it.acceptance_criteria : [],
      client_dependencies: Array.isArray(it?.client_dependencies) ? it.client_dependencies : [],
    };
  });
}

export function mapProposalToTemplateData(p: RawProposal): ProposalDataForTemplate {
  const items = toItems(p.scope_items);
  const total_one_time = items.reduce((acc, it) => acc + (it.total || 0), 0);
  const considerations = Array.isArray(p.considerations)
    ? (p.considerations as unknown[]).map((c) => String(c)).filter(Boolean)
    : [];

  return {
    code: p.code,
    title: p.title || `Proposta ${p.code}`,
    client_name: p.client_company_name,
    client_city: p.client_city,
    client_logo_url: p.client_logo_url,
    client_brand_color: p.client_brand_color ?? null,
    welcome_message: p.welcome_message ?? null,
    executive_summary: p.executive_summary ?? null,
    pain_context: p.pain_context ?? null,
    solution_overview: p.solution_overview ?? null,
    considerations,
    maintenance_description: p.maintenance_description,
    maintenance_monthly_value: p.maintenance_monthly_value,
    implementation_days: p.implementation_days,
    validation_days: p.validation_days,
    expires_at: p.valid_until,
    mockup_url: p.mockup_url ?? null,
    items,
    total_one_time,
    organization: {
      name: GETBRAIN_INFO.legalName,
      cnpj: GETBRAIN_INFO.cnpj,
      city: GETBRAIN_INFO.city,
    },
    generated_at: new Date().toISOString(),
  };
}
