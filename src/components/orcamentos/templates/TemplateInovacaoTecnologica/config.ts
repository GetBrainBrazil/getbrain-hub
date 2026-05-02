import type { TemplateConfig } from "@/lib/orcamentos/templates";

/**
 * Metadata estática do template "Inovação Tecnológica".
 *
 * Quando o template tiver mudança visual significativa (capa, rodapé, paleta,
 * estrutura de páginas), incrementar `version` (semver). Cada `proposal_versions`
 * grava `template_version` usado, permitindo auditoria histórica.
 */
export const config: TemplateConfig = {
  key: "inovacao_tecnologica",
  label: "Inovação Tecnológica",
  description:
    "Proposta padrão GetBrain — capa dark, 7 páginas A4, focada em transformação digital",
  version: "2.0.0",
  pageCount: 7,
};
