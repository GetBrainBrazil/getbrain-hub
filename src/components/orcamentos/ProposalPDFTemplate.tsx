import { ProposalPDFPage1Cover } from "./ProposalPDFPage1Cover";
import { ProposalPDFPage2Institutional } from "./ProposalPDFPage2Institutional";
import { ProposalPDFPage3Proposal } from "./ProposalPDFPage3Proposal";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";

interface Props {
  proposal: Pick<
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
  /** Marcar como id para html2pdf alvejar este nó. */
  domId?: string;
}

/**
 * Template completo de 3 páginas A4 da proposta.
 * Renderizado tanto na tela (preview escalado) quanto na geração de PDF.
 */
export function ProposalPDFTemplate({ proposal, domId = "proposal-pdf-template" }: Props) {
  return (
    <div id={domId} style={{ backgroundColor: "#fff" }}>
      <ProposalPDFPage1Cover
        clientName={proposal.client_company_name}
        clientLogoUrl={proposal.client_logo_url}
      />
      <ProposalPDFPage2Institutional />
      <ProposalPDFPage3Proposal
        scopeItems={Array.isArray(proposal.scope_items) ? (proposal.scope_items as any) : []}
        maintenanceMonthlyValue={proposal.maintenance_monthly_value}
        maintenanceDescription={proposal.maintenance_description}
        implementationDays={proposal.implementation_days}
        validationDays={proposal.validation_days}
        considerations={Array.isArray(proposal.considerations) ? (proposal.considerations as any) : []}
        validUntil={proposal.valid_until}
      />
    </div>
  );
}
