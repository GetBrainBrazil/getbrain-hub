/**
 * Resolve a sprint selecionada (com fallback para a sprint ativa) e a janela
 * de comparação (sprint anterior por padrão). Centraliza a lógica de escopo
 * usada pelo cabeçalho do Dashboard.
 */
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDevHubStore } from "@/hooks/useDevHubStore";

export interface SprintLite {
  id: string;
  code: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
}

export function useSprintsList() {
  return useQuery({
    queryKey: ["sprints-list-dashboard"],
    staleTime: 60_000,
    queryFn: async (): Promise<SprintLite[]> => {
      const { data, error } = await supabase
        .from("sprints")
        .select("id, code, name, status, start_date, end_date")
        .is("deleted_at", null)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SprintLite[];
    },
  });
}

/**
 * Garante que selectedSprintId no store nunca fique nulo quando há sprints
 * disponíveis. Prioridade: ativa → mais recente.
 */
export function useDashboardScope() {
  const selectedSprintId = useDevHubStore((s) => s.selectedSprintId);
  const setSelectedSprintId = useDevHubStore((s) => s.setSelectedSprintId);
  const { data: sprints = [], isLoading } = useSprintsList();

  useEffect(() => {
    if (selectedSprintId || sprints.length === 0) return;
    const active = sprints.find((s) => s.status === "active");
    setSelectedSprintId((active ?? sprints[0]).id);
  }, [selectedSprintId, sprints, setSelectedSprintId]);

  const current = useMemo(
    () => sprints.find((s) => s.id === selectedSprintId) ?? null,
    [sprints, selectedSprintId],
  );

  const previous = useMemo(() => {
    if (!current) return null;
    const idx = sprints.findIndex((s) => s.id === current.id);
    return idx >= 0 && idx + 1 < sprints.length ? sprints[idx + 1] : null;
  }, [sprints, current]);

  return { sprints, current, previous, isLoading, selectedSprintId, setSelectedSprintId };
}
