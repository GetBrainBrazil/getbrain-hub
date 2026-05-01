/**
 * Slug determinístico para gerar a senha padrão de propostas: {slug}@2026.
 *
 * Regras:
 * - lowercase
 * - remove acentos (NFKD + diacríticos)
 * - remove qualquer caractere não-alfanumérico (incluindo espaços)
 * - fallback "cliente" se vazio
 */
export function companySlug(rawName: string | null | undefined): string {
  const base = (rawName ?? "").toString();
  const normalized = base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return normalized || "cliente";
}

export function defaultProposalPassword(rawName: string | null | undefined): string {
  return `${companySlug(rawName)}@2026`;
}
