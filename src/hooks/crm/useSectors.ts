import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Sector, SectorWithChildren } from '@/types/sectors';

const sb = supabase as any;
const ORG_ID = '00000000-0000-0000-0000-000000000001';

function buildTree(rows: Sector[]): SectorWithChildren[] {
  const roots = rows.filter((s) => !s.parent_sector_id);
  return roots
    .map((root) => ({
      ...root,
      children: rows
        .filter((s) => s.parent_sector_id === root.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function useSectors(opts?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['sectors', { includeInactive: !!opts?.includeInactive }],
    queryFn: async (): Promise<SectorWithChildren[]> => {
      let q = sb.from('sectors').select('*').is('deleted_at', null).order('name');
      if (!opts?.includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return buildTree((data ?? []) as Sector[]);
    },
    staleTime: 60_000,
  });
}

export function useSectorsFlat(opts?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['sectors-flat', { includeInactive: !!opts?.includeInactive }],
    queryFn: async (): Promise<Sector[]> => {
      let q = sb.from('sectors').select('*').is('deleted_at', null).order('name');
      if (!opts?.includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Sector[];
    },
    staleTime: 60_000,
  });
}

export function useCreateSector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; parent_sector_id: string | null }) => {
      const { data, error } = await sb
        .from('sectors')
        .insert({
          organization_id: ORG_ID,
          name: payload.name.trim(),
          parent_sector_id: payload.parent_sector_id,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Sector;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sectors'] });
      qc.invalidateQueries({ queryKey: ['sectors-flat'] });
    },
  });
}

export function useUpdateSector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<Sector, 'name' | 'is_active'>> }) => {
      const { error } = await sb.from('sectors').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sectors'] });
      qc.invalidateQueries({ queryKey: ['sectors-flat'] });
    },
  });
}

export function useDeactivateSector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('sectors').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sectors'] });
      qc.invalidateQueries({ queryKey: ['sectors-flat'] });
    },
  });
}

export function useReactivateSector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('sectors').update({ is_active: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sectors'] });
      qc.invalidateQueries({ queryKey: ['sectors-flat'] });
    },
  });
}
