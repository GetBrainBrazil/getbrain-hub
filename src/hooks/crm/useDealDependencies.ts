import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DealDependency, DealDependencyStatus, DealDependencyType } from '@/types/crm';

const sb = supabase as any;
const ORG_ID = '00000000-0000-0000-0000-000000000001';

export function useDealDependencies(dealId?: string) {
  return useQuery({
    queryKey: ['deal-dependencies', dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<DealDependency[]> => {
      const { data, error } = await sb
        .from('deal_dependencies')
        .select('*')
        .eq('deal_id', dealId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      // Auto-flag overdue: agreed_deadline < today AND status != liberado
      const today = new Date().toISOString().slice(0, 10);
      return ((data ?? []) as DealDependency[]).map((d) => {
        if (
          d.agreed_deadline &&
          d.agreed_deadline < today &&
          d.status !== 'liberado' &&
          d.status !== 'atrasado'
        ) {
          return { ...d, status: 'atrasado' as DealDependencyStatus };
        }
        return d;
      });
    },
  });
}

export function useCreateDealDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      deal_id: string;
      dependency_type: DealDependencyType;
      description: string;
      responsible_person_name?: string | null;
      responsible_person_role?: string | null;
      agreed_deadline?: string | null;
      status?: DealDependencyStatus;
      notes?: string | null;
    }) => {
      const { data, error } = await sb
        .from('deal_dependencies')
        .insert({
          organization_id: ORG_ID,
          deal_id: payload.deal_id,
          dependency_type: payload.dependency_type,
          description: payload.description.trim(),
          responsible_person_name: payload.responsible_person_name ?? null,
          responsible_person_role: payload.responsible_person_role ?? null,
          agreed_deadline: payload.agreed_deadline ?? null,
          status: payload.status ?? 'aguardando_combinar',
          notes: payload.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as DealDependency;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['deal-dependencies', vars.deal_id] });
    },
  });
}

export function useUpdateDealDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      deal_id,
      updates,
    }: {
      id: string;
      deal_id: string;
      updates: Partial<DealDependency>;
    }) => {
      const { error } = await sb.from('deal_dependencies').update(updates).eq('id', id);
      if (error) throw error;
      return { deal_id };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['deal-dependencies', res.deal_id] });
    },
  });
}

export function useDeleteDealDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, deal_id }: { id: string; deal_id: string }) => {
      const { error } = await sb
        .from('deal_dependencies')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { deal_id };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['deal-dependencies', res.deal_id] });
    },
  });
}
