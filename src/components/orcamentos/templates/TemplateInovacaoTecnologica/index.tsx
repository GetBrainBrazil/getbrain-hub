import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";
import { Page1Cover } from "./Page1Cover";
import { Page2Institutional } from "./Page2Institutional";
import { Page3Proposal } from "./Page3Proposal";

export type TemplateProposalShape = Pick<
  ProposalDetail,
  | "client_company_name"
  | "client_logo_url"
  | "scope_items"
  | "maintenance_monthly_value"
  | "maintenance_description"
  | "implementation_days"
  | "validation_days"
  | "considerations"
  | "valid_until"
>;

interface Props {
  proposal: TemplateProposalShape;
}

/**
 * Template "Inovação Tecnológica" — 3 páginas A4 (capa preta + institucional + proposta).
 * É o template padrão da GetBrain.
 */
export function TemplateInovacaoTecnologica({ proposal }: Props) {
  return (
    <>
      <Page1Cover
        clientName={proposal.client_company_name}
        clientLogoUrl={proposal.client_logo_url}
      />
      <Page2Institutional />
      <Page3Proposal
        scopeItems={Array.isArray(proposal.scope_items) ? (proposal.scope_items as any) : []}
        maintenanceMonthlyValue={proposal.maintenance_monthly_value}
        maintenanceDescription={proposal.maintenance_description}
        implementationDays={proposal.implementation_days}
        validationDays={proposal.validation_days}
        considerations={Array.isArray(proposal.considerations) ? (proposal.considerations as any) : []}
        validUntil={proposal.valid_until}
      />
    </>
  );
}
