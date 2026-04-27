import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DealStage } from '@/types/crm';

const sb = supabase as any;

export interface DealIndicatorsMap {
  /** dealId -> count de dependências atrasadas (deadline < hoje && status != 'liberado') */
  overdueDepsByDeal: Record<string, number>;
  /** total agregado de deps atrasadas em deals ativos (não fechados) */
  totalOverdueDeps: number;
}

const ACTIVE_STAGES: DealStage[] = [
  'presencial_agendada',
  'presencial_feita',
  'orcamento_enviado',
  'em_negociacao',
];

export function useDealsIndicators() {
  return useQuery({
    queryKey: ['crm-deals-indicators'],
    staleTime: 30_000,
    queryFn: async (): Promise<DealIndicatorsMap> => {
      // 1. Pega deals ativos (apenas id + stage)
      const { data: deals, error: dealsErr } = await sb
        .from('deals')
        .select('id, stage')
        .is('deleted_at', null)
        .in('stage', ACTIVE_STAGES);
      if (dealsErr) throw dealsErr;
      const activeIds: string[] = (deals ?? []).map((d: any) => d.id);
      if (!activeIds.length) {
        return { overdueDepsByDeal: {}, totalOverdueDeps: 0 };
      }
      // 2. Busca deps desses deals
      const { data: deps, error: depsErr } = await sb
        .from('deal_dependencies')
        .select('deal_id, status, agreed_deadline')
        .in('deal_id', activeIds)
        .is('deleted_at', null);
      if (depsErr) throw depsErr;
      const today = new Date().toISOString().slice(0, 10);
      const map: Record<string, number> = {};
      let total = 0;
      for (const dep of (deps ?? []) as any[]) {
        if (dep.status === 'liberado') continue;
        if (!dep.agreed_deadline) continue;
        if (dep.agreed_deadline >= today) continue;
        map[dep.deal_id] = (map[dep.deal_id] ?? 0) + 1;
        total += 1;
      }
      return { overdueDepsByDeal: map, totalOverdueDeps: total };
    },
  });
}
