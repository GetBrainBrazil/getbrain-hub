import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CrmMetrics } from '@/types/crm';

const sb = supabase as any;

const EMPTY: CrmMetrics = {
  leads_novos: 0, leads_triagem_agendada: 0, leads_triagem_feita: 0, leads_descartados: 0, leads_convertidos: 0,
  deals_ativos: 0, pipeline_total_brl: 0, forecast_ponderado_brl: 0, deals_ganhos_total: 0, deals_perdidos_total: 0,
  receita_ganha_total_brl: 0, conversion_rate_pct: 0, ticket_medio_brl: 0,
};

export function useCrmMetrics() {
  return useQuery({
    queryKey: ['crm-metrics'],
    queryFn: async (): Promise<CrmMetrics> => {
      const { data, error } = await sb.from('crm_pipeline_metrics').select('*').maybeSingle();
      if (error) throw error;
      return { ...EMPTY, ...(data ?? {}) } as CrmMetrics;
    },
    staleTime: 30_000,
  });
}
