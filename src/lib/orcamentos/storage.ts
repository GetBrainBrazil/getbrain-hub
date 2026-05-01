import { supabase } from "@/integrations/supabase/client";
import {
  PROPOSALS_BUCKET,
  SIGNED_URL_TTL_INTERNAL,
} from "./storageConfig";

/**
 * Gera uma signed URL on-demand para baixar um PDF de proposta.
 *
 * Aceita tanto um storage path puro (`{proposal_id}/v3-12345.pdf`) quanto
 * uma URL completa legada (extrai o path automaticamente). NUNCA armazena
 * URL assinada — sempre gera na hora.
 *
 * @param pathOrUrl Storage path relativo ao bucket OU URL completa legada
 * @param expiresIn TTL em segundos (default: 5 min, uso interno)
 */
export async function getProposalPdfSignedUrl(
  pathOrUrl: string,
  expiresIn: number = SIGNED_URL_TTL_INTERNAL
): Promise<string> {
  if (!pathOrUrl) throw new Error("Storage path vazio");

  const path = normalizeProposalPath(pathOrUrl);

  const { data, error } = await supabase.storage
    .from(PROPOSALS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Falha ao gerar signed URL");
  }
  return data.signedUrl;
}

/**
 * Extrai o storage path relativo ao bucket `proposals`, aceitando:
 *  - path puro: `abc-123/v1-1714506732.pdf`
 *  - public URL legada: `.../storage/v1/object/public/proposals/abc-123/...`
 *  - signed URL: `.../storage/v1/object/sign/proposals/abc-123/...?token=...`
 */
function normalizeProposalPath(input: string): string {
  if (!input.includes("/proposals/")) return input.replace(/^\/+/, "");
  const marker = "/proposals/";
  const idx = input.indexOf(marker);
  const after = input.slice(idx + marker.length);
  // remove querystring de signed URLs
  return after.split("?")[0];
}

/**
 * Abre o PDF em nova aba via signed URL fresh.
 * Conveniente para botões "Baixar" no editor e na aba Versões.
 */
export async function openProposalPdf(pathOrUrl: string): Promise<void> {
  const url = await getProposalPdfSignedUrl(pathOrUrl);
  window.open(url, "_blank", "noopener,noreferrer");
}
