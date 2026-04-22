/**
 * Hook que consome a view `project_metrics` para um projeto.
 * Cache de 30s via React Query.
 *
 * INTEGRAÇÕES ATIVAS (Seção 13 do ARCHITECTURE.md):
 *  - Financeiro (movimentacoes via source_entity_id/type)
 *  - Marcos, Dependências, Riscos, Integrações, Contratos, Time
 *
 * PENDENTES (futuros prompts):
 *  - Tarefas (Área Dev) — Prompt 03
 *  - Suporte
 *  - Tokens consumidos
 *
 * Quando cada módulo for criado, basta atualizar a view SQL: o hook e
 * todos os consumidores ganham os dados automaticamente.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectMetrics } from "@/types/database";

export function useProjectMetrics(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-metrics", projectId],
    enabled: !!projectId,
    staleTime: 30_000,
    queryFn: async () => {
      // `project_metrics` ainda não está nos tipos gerados — cast pontual.
      const { data, error } = await (supabase as any)
        .from("project_metrics")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProjectMetrics | null;
    },
  });
}
