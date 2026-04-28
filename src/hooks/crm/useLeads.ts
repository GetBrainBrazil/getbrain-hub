import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Lead } from '@/types/crm';

const sb = supabase as any;
const ORG_ID = '00000000-0000-0000-0000-000000000001';

export function useLeads() {
  return useQuery({
    queryKey: ['crm-leads'],
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await sb.from('leads').select('*').is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Lead> & { title: string; company_id: string }) => {
      const { data, error } = await sb.from('leads').insert({
        organization_id: ORG_ID,
        title: payload.title,
        company_id: payload.company_id,
        contact_person_id: payload.contact_person_id || null,
        owner_actor_id: payload.owner_actor_id || null,
        source: payload.source || null,
        estimated_value: payload.estimated_value ?? null,
        pain_description: payload.pain_description || null,
        status: 'novo',
      }).select().single();
      if (error) throw error;
      return data as Lead;
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['crm-leads'] }); qc.invalidateQueries({ queryKey: ['crm-metrics'] }); qc.invalidateQueries({ queryKey: ['crm-lead-sources'] }); },
  });
}

export function useConvertLeadToDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, dealData = {} }: { leadId: string; dealData?: Record<string, unknown> }) => {
      const { data, error } = await sb.rpc('convert_lead_to_deal', { p_lead_id: leadId, p_deal_data: dealData });
      if (error) throw error;
      return data as string;
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['crm-leads'] }); qc.invalidateQueries({ queryKey: ['crm-deals'] }); qc.invalidateQueries({ queryKey: ['crm-metrics'] }); },
  });
}

export function useBulkDeleteLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]): Promise<{ deleted: number; skipped: number }> => {
      if (!ids.length) return { deleted: 0, skipped: 0 };
      // Filtra leads já convertidos (têm deal vinculado) — preserva integridade
      const { data: rows, error: fetchErr } = await sb
        .from('leads')
        .select('id, converted_to_deal_id')
        .in('id', ids);
      if (fetchErr) throw fetchErr;
      const deletable = (rows ?? [])
        .filter((r: { converted_to_deal_id: string | null }) => !r.converted_to_deal_id)
        .map((r: { id: string }) => r.id);
      const skipped = ids.length - deletable.length;
      if (deletable.length) {
        await sb.from('deal_activities').delete().in('lead_id', deletable);
        const { error } = await sb.from('leads').delete().in('id', deletable);
        if (error) throw error;
      }
      return { deleted: deletable.length, skipped };
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      qc.invalidateQueries({ queryKey: ['crm-leads-full'] });
      qc.invalidateQueries({ queryKey: ['crm-lead-code'] });
      qc.invalidateQueries({ queryKey: ['crm-metrics'] });
      qc.invalidateQueries({ queryKey: ['crm-dashboard-exec'] });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Hard delete: remove atividades vinculadas ao lead antes
      await sb.from('deal_activities').delete().eq('lead_id', id);
      const { error } = await sb.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      qc.invalidateQueries({ queryKey: ['crm-leads-full'] });
      qc.invalidateQueries({ queryKey: ['crm-lead-code'] });
      qc.invalidateQueries({ queryKey: ['crm-metrics'] });
      qc.invalidateQueries({ queryKey: ['crm-dashboard-exec'] });
    },
  });
}
