import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  DealDependency, DealDependencyStatus, DealDependencyType, DealDependencyPriority,
} from '@/types/crm';

const sb = supabase as any;
const ORG_ID = '00000000-0000-0000-0000-000000000001';

export interface DependencyMutationPayload {
  dependency_type: DealDependencyType;
  description: string;
  responsible_person_name?: string | null;
  responsible_person_role?: string | null;
  responsible_email?: string | null;
  responsible_phone?: string | null;
  agreed_deadline?: string | null;
  requested_at?: string | null;
  status?: DealDependencyStatus;
  priority?: DealDependencyPriority;
  is_blocker?: boolean;
  internal_owner_actor_id?: string | null;
  impact_if_missing?: string | null;
  links?: string[];
  notes?: string | null;
}

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
    mutationFn: async (payload: { deal_id: string } & DependencyMutationPayload) => {
      const { deal_id, ...rest } = payload;
      const { data, error } = await sb
        .from('deal_dependencies')
        .insert({
          organization_id: ORG_ID,
          deal_id,
          dependency_type: rest.dependency_type,
          description: rest.description.trim(),
          responsible_person_name: rest.responsible_person_name ?? null,
          responsible_person_role: rest.responsible_person_role ?? null,
          responsible_email: rest.responsible_email ?? null,
          responsible_phone: rest.responsible_phone ?? null,
          agreed_deadline: rest.agreed_deadline ?? null,
          requested_at: rest.requested_at ?? null,
          status: rest.status ?? 'aguardando_combinar',
          priority: rest.priority ?? 'media',
          is_blocker: rest.is_blocker ?? false,
          internal_owner_actor_id: rest.internal_owner_actor_id ?? null,
          impact_if_missing: rest.impact_if_missing ?? null,
          links: rest.links ?? [],
          notes: rest.notes ?? null,
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
