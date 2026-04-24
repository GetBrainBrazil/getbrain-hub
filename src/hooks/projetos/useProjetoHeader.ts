/**
 * Busca dados mínimos do projeto + cliente para renderizar o cabeçalho
 * compartilhado das telas detalhadas (Financeiro/Tarefas/Suporte/Tokens).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjetoHeaderData {
  id: string;
  code: string;
  name: string;
  status: string;
  company_id: string;
  company_name: string | null;
  contract_value: number | null;
  estimated_delivery_date: string | null;
}

export function useProjetoHeader(projectId: string | undefined) {
  return useQuery({
    queryKey: ["projeto-header", projectId],
    enabled: !!projectId,
    staleTime: 60_000,
    queryFn: async (): Promise<ProjetoHeaderData | null> => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, code, name, status, company_id, contract_value, estimated_delivery_date, companies(legal_name, trade_name)",
        )
        .eq("id", projectId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const company = (data as any).companies;
      return {
        id: data.id,
        code: data.code,
        name: data.name,
        status: data.status,
        company_id: data.company_id,
        company_name: company?.trade_name || company?.legal_name || null,
        contract_value: data.contract_value,
        estimated_delivery_date: data.estimated_delivery_date,
      };
    },
  });
}
