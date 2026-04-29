import { useEffect, useRef, useState } from "react";
import { ArrowRight, FileText, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/formatters";
import { DEAL_STAGE_LABEL } from "@/constants/dealStages";
import type { Deal, DealStage } from "@/types/crm";

export interface CreateProposalSubmitPayload {
  implementationValue: number;
  mrrValue?: number;
}

interface Props {
  open: boolean;
  deal: Deal | null;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onConfirm: (payload: CreateProposalSubmitPayload) => void | Promise<void>;
}

function toStr(n: number | null | undefined): string {
  return n && Number(n) > 0 ? String(n) : "";
}

export function CreateProposalForStageDialog({ open, deal, onOpenChange, loading, onConfirm }: Props) {
  const [implementationStr, setImplementationStr] = useState("");
  const [mrrStr, setMrrStr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !deal) return;
    // Pré-preenche: implementação > estimated_value (fallback) > vazio
    const implPrefill =
      deal.estimated_implementation_value ?? deal.estimated_value ?? null;
    setImplementationStr(toStr(implPrefill as number | null));
    setMrrStr(toStr(deal.estimated_mrr_value as number | null));
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [open, deal]);

  if (!deal) return null;

  const companyLabel = deal.company?.trade_name || deal.company?.legal_name || "Empresa não informada";
  const fromStageLabel = DEAL_STAGE_LABEL[deal.stage as DealStage] ?? deal.stage;
  const parsedImpl = Number(implementationStr.replace(",", "."));
  const parsedMrr = Number(mrrStr.replace(",", "."));
  const implIsValid = Number.isFinite(parsedImpl) && parsedImpl > 0;
  const mrrIsValid = mrrStr === "" || (Number.isFinite(parsedMrr) && parsedMrr >= 0);
  const canSubmit = implIsValid && mrrIsValid && !loading;

  const totalAnoEstimado =
    (implIsValid ? parsedImpl : 0) + (mrrIsValid && parsedMrr > 0 ? parsedMrr * 12 : 0);

  const handleConfirm = async () => {
    if (!canSubmit) return;
    await onConfirm({
      implementationValue: parsedImpl,
      mrrValue: mrrIsValid && parsedMrr > 0 ? parsedMrr : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-br from-accent/5 via-background to-background">
          <DialogHeader className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-semibold leading-tight">
                  Criar proposta para avançar
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Para mover o deal para <span className="font-medium text-foreground">Proposta na Mesa</span>, é
                  preciso ter um orçamento vinculado.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Card de contexto do deal */}
          <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Empresa</p>
                <p className="truncate text-sm font-medium text-foreground">{companyLabel}</p>
              </div>
              {deal.code && (
                <span className="shrink-0 rounded-md bg-background px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
                  {deal.code}
                </span>
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{fromStageLabel}</span>
              <ArrowRight className="h-3 w-3 text-accent" />
              <span className="font-medium text-accent">Proposta na Mesa</span>
            </div>
          </div>

          {/* Campos de valor: implementação + MRR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="impl-value" className="text-xs">
                Valor de implementação <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  R$
                </span>
                <Input
                  id="impl-value"
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={implementationStr}
                  onChange={(e) => setImplementationStr(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit) handleConfirm();
                  }}
                  className="pl-9 font-mono"
                  disabled={loading}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">One-time. Vira o item inicial da proposta.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mrr-value" className="text-xs">
                MRR mensal <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  R$
                </span>
                <Input
                  id="mrr-value"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={mrrStr}
                  onChange={(e) => setMrrStr(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit) handleConfirm();
                  }}
                  className="pl-9 font-mono"
                  disabled={loading}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Deixe em branco se não houver mensalidade.</p>
            </div>
          </div>

          {/* Total estimado ano 1 */}
          {totalAnoEstimado > 0 && (
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Estimado no ano 1 (impl. + 12× MRR)</span>
              <span className="font-mono font-semibold text-foreground">{formatCurrency(totalAnoEstimado)}</span>
            </div>
          )}

          {/* Aviso informativo */}
          <div className="flex gap-2.5 rounded-md border-l-2 border-accent bg-muted/40 px-3 py-2.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Vamos criar um <span className="font-medium text-foreground">rascunho de proposta</span> já vinculado a
              este deal, com os valores acima preenchidos, e te levar direto para a tela de edição.
            </p>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/10 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit} className="gap-1.5">
            {loading ? "Criando…" : (
              <>
                Criar e abrir proposta
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
