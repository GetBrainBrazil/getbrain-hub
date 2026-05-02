/**
 * Helper centralizado para montar URLs públicas de propostas.
 *
 * Sempre usamos o domínio canônico `hub.getbrain.com.br` em vez de
 * `window.location.origin` — pra evitar gerar links com o host do preview
 * Lovable (`*.lovableproject.com` ou `id-preview--*.lovable.app`), que o
 * cliente não consegue acessar e quebra o QR Code.
 */

export const PUBLIC_PROPOSAL_BASE = "https://hub.getbrain.com.br/p";

export interface BuildPublicUrlOptions {
  /** JWT temporário pra preview interno como cliente. */
  previewJwt?: string | null;
}

export function buildPublicProposalUrl(
  accessToken: string | null | undefined,
  opts: BuildPublicUrlOptions = {},
): string | null {
  if (!accessToken) return null;
  const base = `${PUBLIC_PROPOSAL_BASE}/${accessToken}`;
  if (opts.previewJwt) {
    return `${base}?preview=${encodeURIComponent(opts.previewJwt)}`;
  }
  return base;
}
