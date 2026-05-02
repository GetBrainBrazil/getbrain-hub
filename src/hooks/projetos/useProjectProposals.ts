/**
 * Carrega todas as propostas vinculadas a um projeto (via deal de origem)
 * + os anexos herdados do deal (organograma, mockup link, prints).
 *
 * Usado pela aba "Propostas & Anexos" em /projetos/:id.
 * Modo somente leitura — edição continua no CRM ou no editor de orçamentos.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProposalStatus, ScopeItem } from "@/lib/orcamentos/calculateTotal";

const sb = supabase as any;

export interface ProjectProposalRow {
  id: string;
  code: string;
  status: ProposalStatus;
  scope_items: ScopeItem[] | null;
  maintenance_monthly_value: number | null;
  valid_until: string;
  pdf_url: string | null;
  access_token: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number | null;
  created_at: string;
  client_company_name: string | null;
  client_name: string | null;
}

export interface ProjectProposalsPayload {
  /** ID do deal vinculado a este projeto (null se o projeto foi criado manualmente). */
  sourceDealId: string | null;
  /** Código do deal de origem, ex "DEAL-008". Útil pra link "Editar no deal". */
  sourceDealCode: string | null;
  /** Lista de propostas (qualquer status), mais recente primeiro. */
  proposals: ProjectProposalRow[];
  /** URL assinada do organograma (PNG/PDF), herdada do deal. */
  organogramaUrl: string | null;
  /** Link do mockup BETA (Lovable preview, etc) herdado do deal. */
  mockupUrl: string | null;
  /** Prints/screenshots do mockup. */
  mockupScreenshots: string[];
}

export function useProjectProposals(projectId: string | null | undefined) {
  return useQuery<ProjectProposalsPayload>({
    queryKey: ["project_proposals", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      // 1. Pega o deal de origem do projeto
      const { data: project, error: projErr } = await sb
        .from("projects")
        .select("source_deal_id")
        .eq("id", projectId)
        .maybeSingle();
      if (projErr) throw projErr;

      const sourceDealId: string | null = project?.source_deal_id ?? null;

      if (!sourceDealId) {
        return {
          sourceDealId: null,
          sourceDealCode: null,
          proposals: [],
          organogramaUrl: null,
          mockupUrl: null,
          mockupScreenshots: [],
        };
      }

      // 2. Em paralelo: dados do deal + propostas
      const [dealRes, proposalsRes] = await Promise.all([
        sb
          .from("deals")
          .select("code, organograma_url, mockup_url, mockup_screenshots")
          .eq("id", sourceDealId)
          .maybeSingle(),
        sb
          .from("proposals")
          .select(
            "id, code, status, scope_items, maintenance_monthly_value, valid_until, pdf_url, access_token, sent_at, accepted_at, rejected_at, first_viewed_at, last_viewed_at, view_count, created_at, client_company_name, client_name",
          )
          .eq("deal_id", sourceDealId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
      ]);

      if (proposalsRes.error) throw proposalsRes.error;

      return {
        sourceDealId,
        sourceDealCode: dealRes.data?.code ?? null,
        proposals: (proposalsRes.data ?? []) as ProjectProposalRow[],
        organogramaUrl: dealRes.data?.organograma_url ?? null,
        mockupUrl: dealRes.data?.mockup_url ?? null,
        mockupScreenshots: (dealRes.data?.mockup_screenshots ?? []) as string[],
      };
    },
  });
}
