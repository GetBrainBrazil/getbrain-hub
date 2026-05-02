import {
  TemplateInovacaoTecnologica,
  type TemplateProposalShape,
} from "./templates/TemplateInovacaoTecnologica";

interface Props {
  proposal: TemplateProposalShape & { template_key?: string | null };
  /** Marcar como id para html2pdf alvejar este nó. */
  domId?: string;
}

/**
 * Container legado usado pelo fluxo html2pdf (10B). O novo fluxo (10D-1) usa
 * `@react-pdf/renderer` via registry de templates em `src/lib/orcamentos/templates.ts`.
 *
 * Hoje só há um template legado disponível: `TemplateInovacaoTecnologica`.
 * Quando o html2pdf for removido, este arquivo pode ser deletado.
 */
export function ProposalPDFTemplate({ proposal, domId = "proposal-pdf-template" }: Props) {
  return (
    <div id={domId} style={{ backgroundColor: "#fff" }}>
      <TemplateInovacaoTecnologica proposal={proposal} />
    </div>
  );
}
