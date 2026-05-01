/**
 * Configuração de Storage para o módulo de Propostas.
 *
 * Bucket `proposals` é PRIVADO. Todo acesso a PDFs gerados deve passar
 * por signed URLs geradas on-demand via {@link getProposalPdfSignedUrl}.
 *
 * Convenção de path versionado:
 *   proposals/{proposal_id}/v{N}-{timestamp}.pdf
 */

export const PROPOSALS_BUCKET = "proposals";

/**
 * TTL para signed URLs usadas dentro do Hub interno (autenticado).
 * 5 minutos — tempo suficiente para o navegador iniciar o download.
 */
export const SIGNED_URL_TTL_INTERNAL = 5 * 60;

/**
 * TTL para signed URLs usadas na página pública de proposta (cliente final).
 * 15 minutos. Não consumido neste prompt — reservado para o 10C.
 */
export const SIGNED_URL_TTL_PUBLIC = 15 * 60;

/**
 * Monta o storage path versionado para um PDF de proposta.
 */
export function buildProposalPdfPath(proposalId: string, versionNumber: number): string {
  const ts = Date.now();
  return `${proposalId}/v${versionNumber}-${ts}.pdf`;
}
