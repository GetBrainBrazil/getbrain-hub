/**
 * Tipos compartilhados entre WebTemplate e PDFTemplate de uma proposta.
 *
 * Decisão arquitetural (10D-1): cada template do módulo Propostas possui
 * dois layouts independentes — `WebComponent` (página pública interativa)
 * e `PDFComponent` (documento React-PDF). Ambos consomem `ProposalDataForTemplate`
 * pra garantir consistência entre o que cliente vê na web e o que recebe por email.
 */

export interface ProposalItemForTemplate {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  detailed_description: string | null;
  deliverables: string[];
  acceptance_criteria: string[];
  client_dependencies: string[];
}

export interface ProposalOrganizationForTemplate {
  /** Razão social ou nome de exibição. */
  name: string;
  /** CNPJ formatado pra rodapé. Pode ser null em propostas legadas. */
  cnpj: string | null;
  /** Cidade/UF de cabeçalho. */
  city: string;
}

export interface ProposalDataForTemplate {
  // Identificação
  code: string;
  title: string;

  // Cliente
  client_name: string;
  client_city: string | null;
  client_logo_url: string | null;
  client_brand_color: string | null;

  // Conteúdo
  welcome_message: string | null;
  executive_summary: string | null;
  pain_context: string | null;
  solution_overview: string | null;
  considerations: string[];
  maintenance_description: string | null;
  maintenance_monthly_value: number | null;
  implementation_days: number | null;
  validation_days: number | null;
  expires_at: string;
  mockup_url: string | null;

  // Itens de escopo (canônicos)
  items: ProposalItemForTemplate[];
  total_one_time: number;

  // Metadata
  organization: ProposalOrganizationForTemplate;
  generated_at: string;
}

/**
 * Props do componente Web (página pública). Não usado neste prompt
 * porque a página pública (`/p/:token`) ainda monta o HTML diretamente
 * a partir do payload da edge function. Reservado pra futura unificação.
 */
export interface WebTemplateProps {
  data: ProposalDataForTemplate;
  mode: "preview" | "public";
}

/**
 * Props do componente PDF (React-PDF Document).
 */
export interface PDFTemplateProps {
  data: ProposalDataForTemplate;
  /** Versão do template no momento da geração — gravada no proposal_versions. */
  templateVersion: string;
  /** URL pública pra QR code. */
  proposalAccessUrl: string;
  /**
   * Se `"draft"` aplica watermark "RASCUNHO" diagonal em todas as páginas.
   * Setado quando o status da proposta é `rascunho` ou `recusada`.
   */
  watermark?: "draft" | null;
  /**
   * Data URL (PNG) do QR code apontando pra `proposalAccessUrl`.
   * Renderizado na contracapa e/ou no rodapé da capa.
   */
  qrCodeDataUrl?: string | null;
}
