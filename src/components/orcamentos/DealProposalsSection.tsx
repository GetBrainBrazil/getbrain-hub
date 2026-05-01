import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FileText,
  Loader2,
  ExternalLink,
  Download,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
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
import { openProposalPdf } from "@/lib/orcamentos/storage";
import { createProposalFromDeal } from "@/lib/orcamentos/createProposalFromDeal";
import { invalidateProposalCaches } from "@/lib/cacheInvalidation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  dealId: string;
  companyId: string;
  companyName: string;
}

interface ConflictState {
  open: boolean;
  existingCode?: string;
  existingId?: string;
  message?: string;
}

export function DealProposalsSection({ dealId, companyId, companyName }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [conflict, setConflict] = useState<ConflictState>({ open: false });

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("proposals" as any)
      .select(
        "id, code, status, scope_items, valid_until, pdf_url, created_at, deal_id"
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

  async function runCreate(forceNewVersion: boolean) {
    setCreating(true);
    try {
      const result = await createProposalFromDeal(dealId, forceNewVersion);

      if ("conflict" in result && result.conflict) {
        setConflict({
          open: true,
          existingCode: result.existingProposalCode,
          existingId: result.existingProposalId,
          message: result.message,
        });
        return;
      }

      const created = result as Exclude<typeof result, { conflict: true }>;
      invalidateProposalCaches(qc);
      toast.success(`Proposta ${created.proposalCode} criada`, {
        description: `${created.itemsImported} item(ns) importados do deal. Senha: ${created.defaultPasswordPlain}`,
        duration: 8000,
      });
      navigate(`/financeiro/orcamentos/${created.proposalId}/editar`);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar proposta a partir do deal");
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmConflict() {
    setConflict({ open: false });
    await runCreate(true);
  }

  function goToExisting() {
    if (conflict.existingId) {
      navigate(`/financeiro/orcamentos/${conflict.existingId}/editar`);
    }
    setConflict({ open: false });
  }

  const hasProposals = rows.length > 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Propostas comerciais</h2>
        {hasProposals && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => runCreate(false)}
            disabled={creating}
          >
            {creating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Gerar nova versão
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Carregando…</div>
      ) : !hasProposals ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-base mb-1">
            Sem proposta vinculada
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Importe os dados deste deal para criar uma proposta pronta pra
            revisão.
          </p>
          <Button onClick={() => runCreate(false)} disabled={creating}>
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Gerar proposta a partir deste deal
          </Button>
          <p className="text-[11px] text-muted-foreground mt-3">
            Vamos puxar dor, solução, escopo e dependências automaticamente.
            Você revisa antes de enviar.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {rows.map((r) => {
            const total = calculateScopeTotal(r.scope_items);
            const eff = effectiveStatus(
              r.status as ProposalStatus,
              r.valid_until
            );
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer"
                onClick={() =>
                  navigate(`/financeiro/orcamentos/${r.id}/editar`)
                }
              >
                <span className="font-mono text-xs font-semibold">
                  {r.code}
                </span>
                <OrcamentoStatusBadge status={eff} />
                <span className="text-sm font-medium tabular-nums text-success ml-auto">
                  {formatBRL(total)}
                </span>
                <span className="text-xs text-muted-foreground w-20 text-right">
                  {formatDateBR(r.valid_until)}
                </span>
                {r.pdf_url && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await openProposalPdf(r.pdf_url!);
                      } catch (err: any) {
                        toast.error(err?.message || "Falha ao abrir PDF");
                      }
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={conflict.open}
        onOpenChange={(o) => setConflict((s) => ({ ...s, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Já existe proposta ativa
            </DialogTitle>
            <DialogDescription>
              {conflict.message ||
                `A proposta ${conflict.existingCode} já está vinculada a este deal.`}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Você pode continuar editando a proposta existente ou gerar uma nova
            versão (a anterior continua salva no histórico).
          </p>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={goToExisting}>
              Abrir proposta existente
            </Button>
            <Button onClick={handleConfirmConflict} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Gerar mesmo assim como nova versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
