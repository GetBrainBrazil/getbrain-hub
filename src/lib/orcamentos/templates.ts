/**
 * Registry de templates de proposta.
 *
 * Decisão arquitetural (10D-1): cada template possui dois layouts independentes:
 * - `WebComponent`: página pública interativa (placeholder hoje — a página
 *   pública atual em `PropostaPublica.tsx` ainda monta HTML direto da edge func).
 * - `PDFComponent`: documento React-PDF formal pra envio por email/WhatsApp.
 *
 * Adicionar template novo:
 *   1. Criar pasta em `src/components/orcamentos/templates/TemplateXxx/`
 *      contendo `config.ts`, `WebTemplate/`, `PDFTemplate/`.
 *   2. Importar e registrar abaixo em `TEMPLATES`.
 *   3. Adicionar a chave em `TemplateKey`.
 */

import type { FC } from "react";
import type {
  WebTemplateProps,
  PDFTemplateProps,
} from "@/types/proposal-template-props";
import {
  WebTemplateInovacaoTecnologica,
} from "@/components/orcamentos/templates/TemplateInovacaoTecnologica/WebTemplate";
import {
  PDFTemplateInovacaoTecnologica,
} from "@/components/orcamentos/templates/TemplateInovacaoTecnologica/PDFTemplate";
import { config as inovacaoConfig } from "@/components/orcamentos/templates/TemplateInovacaoTecnologica/config";

export type TemplateKey = "inovacao_tecnologica";

export interface TemplateConfig {
  key: TemplateKey;
  label: string;
  description: string;
  version: string;
  /** Estimativa pra UI mostrar antes da geração. */
  pageCount: number;
}

export interface TemplateDefinition {
  config: TemplateConfig;
  WebComponent: FC<WebTemplateProps>;
  PDFComponent: FC<PDFTemplateProps>;
}

export const TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  inovacao_tecnologica: {
    config: inovacaoConfig,
    WebComponent: WebTemplateInovacaoTecnologica,
    PDFComponent: PDFTemplateInovacaoTecnologica,
  },
};

const FALLBACK_KEY: TemplateKey = "inovacao_tecnologica";

function resolveKey(key: TemplateKey | string | null | undefined): TemplateKey {
  if (key && key in TEMPLATES) return key as TemplateKey;
  if (key) console.warn(`[templates] "${key}" não encontrado, usando fallback`);
  return FALLBACK_KEY;
}

/** Retorna apenas a configuração (label, version, pageCount) — usado em listas. */
export function listTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATES).map((t) => t.config);
}

/** Retorna a definição completa (config + componentes Web + PDF). */
export function getTemplate(key: TemplateKey | string | null | undefined): TemplateDefinition {
  return TEMPLATES[resolveKey(key)];
}

export function getTemplateConfig(key: TemplateKey | string | null | undefined): TemplateConfig {
  return TEMPLATES[resolveKey(key)].config;
}

export function getWebTemplate(key: TemplateKey | string | null | undefined): FC<WebTemplateProps> {
  return TEMPLATES[resolveKey(key)].WebComponent;
}

export function getPDFTemplate(key: TemplateKey | string | null | undefined): FC<PDFTemplateProps> {
  return TEMPLATES[resolveKey(key)].PDFComponent;
}
