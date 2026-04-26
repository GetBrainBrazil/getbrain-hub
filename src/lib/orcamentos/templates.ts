import type { FC } from "react";
import {
  TemplateInovacaoTecnologica,
  type TemplateProposalShape,
} from "@/components/orcamentos/templates/TemplateInovacaoTecnologica";

export type TemplateKey = "inovacao_tecnologica";

export interface TemplateDefinition {
  key: TemplateKey;
  label: string;
  description: string;
  Component: FC<{ proposal: TemplateProposalShape }>;
  pageCount: number;
}

export const TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  inovacao_tecnologica: {
    key: "inovacao_tecnologica",
    label: "Inovação Tecnológica",
    description: "Proposta padrão GetBrain — capa dark, 3 páginas A4",
    Component: TemplateInovacaoTecnologica,
    pageCount: 3,
  },
};

export function getTemplate(key: TemplateKey | string | null | undefined): TemplateDefinition {
  const t = key ? TEMPLATES[key as TemplateKey] : undefined;
  if (!t) {
    if (key) console.warn(`Template "${key}" não encontrado, usando padrão`);
    return TEMPLATES.inovacao_tecnologica;
  }
  return t;
}

export function listTemplates(): TemplateDefinition[] {
  return Object.values(TEMPLATES);
}
