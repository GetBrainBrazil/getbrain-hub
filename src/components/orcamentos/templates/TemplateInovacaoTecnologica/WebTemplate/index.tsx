/**
 * WebTemplate "Inovação Tecnológica" — página pública interativa.
 *
 * **Status atual (10D-1)**: a página pública (`/p/:token` em `PropostaPublica.tsx`)
 * monta o HTML diretamente a partir do payload da edge function pública,
 * sem passar pelo registry de templates. Este componente existe pra preparar
 * o caminho de unificação em prompts futuros (quando múltiplos templates web
 * precisarem coexistir, cada um com layout próprio).
 *
 * Por ora retorna um placeholder vazio. Não é renderizado em lugar nenhum.
 */

import type { WebTemplateProps } from "@/types/proposal-template-props";

export function WebTemplateInovacaoTecnologica(_props: WebTemplateProps) {
  return null;
}
