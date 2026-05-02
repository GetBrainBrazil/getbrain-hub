import { getTemplate, type TemplateKey } from "@/lib/orcamentos/templates";
import type { TemplateProposalShape } from "./templates/TemplateInovacaoTecnologica";

interface Props {
  proposal: TemplateProposalShape & { template_key?: string | null };
  /** Marcar como id para html2pdf alvejar este nó. */
  domId?: string;
}

/**
 * Container roteador: escolhe o template a renderizar conforme `template_key`.
 * Adicionar template novo = registrar em src/lib/orcamentos/templates.ts.
 */
export function ProposalPDFTemplate({ proposal, domId = "proposal-pdf-template" }: Props) {
  const template = getTemplate(proposal.template_key as TemplateKey | undefined);
  const Component = template.WebComponent;
  return (
    <div id={domId} style={{ backgroundColor: "#fff" }}>
      <Component proposal={proposal} />
    </div>
  );
}
