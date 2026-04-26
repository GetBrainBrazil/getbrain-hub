import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Loader2, ExternalLink, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OrcamentoStatusBadge } from "@/components/orcamentos/OrcamentoStatusBadge";
import {
  calculateScopeTotal,
  effectiveStatus,
  formatBRL,
  formatDateBR,
  type ProposalStatus,
} from "@/lib/orcamentos/calculateTotal";
import { toast } from "sonner";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

interface Props {
  dealId: string;
  companyId: string;
  companyName: string;
}

export function DealProposalsSection({ dealId, companyId, companyName }: Props) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("proposals" as any)
      .select(
        "id, code, status, scope_items, valid_until, pdf_url, created_at"
      )
      .eq("deal_id", dealId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setRows((data || []) as any[]);
    setLoading(false);
  }

  useEffect(() => {
    if (dealId) load();
  }, [dealId]);

  async function handleCreate() {
    setCreating(true);
    try {
      const userRes = await supabase.auth.getUser();
      const uid = userRes.data.user?.id ?? null;
      const validUntil = new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .slice(0, 10);
      const { data, error } = await supabase
        .from("proposals" as any)
        .insert({
          organization_id: ORG_ID,
          deal_id: dealId,
          company_id: companyId,
          status: "rascunho",
          client_company_name: companyName,
          scope_items: [],
          valid_until: validUntil,
          created_by: uid,
          updated_by: uid,
        })
        .select("id")
        .single();
      if (error) throw error;
      navigate(`/financeiro/orcamentos/${(data as any).id}/editar`);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar orçamento");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Propostas comerciais</h2>
        <Button size="sm" onClick={handleCreate} disabled={creating}>
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Criar Proposta
        </Button>
      </div>
      {loading ? (
        <div className="text-xs text-muted-foreground">Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto h-6 w-6 mb-2 opacity-40" />
          Nenhuma proposta vinculada a este deal ainda.
        </div>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {rows.map((r) => {
            const total = calculateScopeTotal(r.scope_items);
            const eff = effectiveStatus(r.status as ProposalStatus, r.valid_until);
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer"
                onClick={() => navigate(`/financeiro/orcamentos/${r.id}/editar`)}
              >
                <span className="font-mono text-xs font-semibold">{r.code}</span>
                <OrcamentoStatusBadge status={eff} />
                <span className="text-sm font-medium tabular-nums text-success ml-auto">
                  {formatBRL(total)}
                </span>
                <span className="text-xs text-muted-foreground w-20 text-right">
                  {formatDateBR(r.valid_until)}
                </span>
                {r.pdf_url && (
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a href={r.pdf_url} target="_blank" rel="noreferrer">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
