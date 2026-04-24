import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DealActivity } from '@/types/crm';

const sb = supabase as any;
const ORG_ID = '00000000-0000-0000-0000-000000000001';

export function useDealActivities(dealId: string | null) {
  return useQuery({
    queryKey: ['crm-deal-activities', dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<DealActivity[]> => {
      const { data, error } = await sb.from('deal_activities').select('*').eq('deal_id', dealId).is('deleted_at', null).order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLeadActivities(leadId: string | null) {
  return useQuery({
    queryKey: ['crm-lead-activities', leadId],
    enabled: !!leadId,
    queryFn: async (): Promise<DealActivity[]> => {
      const { data, error } = await sb.from('deal_activities').select('*').eq('lead_id', leadId).is('deleted_at', null).order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<DealActivity> & { title: string; type: string }) => {
      const { data, error } = await sb.from('deal_activities').insert({ ...payload, organization_id: ORG_ID }).select().single();
      if (error) throw error;
      return data as DealActivity;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['crm-deal-activities'] });
      qc.invalidateQueries({ queryKey: ['crm-lead-activities'] });
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
    },
  });
}
