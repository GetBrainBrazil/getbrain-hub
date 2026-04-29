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

interface Props {
  open: boolean;
  deal: Deal | null;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  /** Recebe o valor estimado quando o deal não tinha valor antes. */
  onConfirm: (estimatedValue?: number) => void | Promise<void>;
}

export function CreateProposalForStageDialog({ open, deal, onOpenChange, loading, onConfirm }: Props) {
  const needsValue = !!deal && !deal.estimated_value;
  const [valueStr, setValueStr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValueStr("");
      // foco no input quando precisar de valor
      if (needsValue) setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, needsValue]);

  if (!deal) return null;

  const companyLabel = deal.company?.trade_name || deal.company?.legal_name || "Empresa não informada";
  const fromStageLabel = DEAL_STAGE_LABEL[deal.stage as DealStage] ?? deal.stage;
  const parsedValue = Number(valueStr.replace(",", "."));
  const valueIsValid = !needsValue || (Number.isFinite(parsedValue) && parsedValue > 0);

  const handleConfirm = async () => {
    if (!valueIsValid) return;
    await onConfirm(needsValue ? parsedValue : undefined);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
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
              {!needsValue && (
                <span className="ml-auto font-mono text-foreground">
                  {formatCurrency(Number(deal.estimated_value))}
                </span>
              )}
            </div>
          </div>

          {/* Campo de valor (se necessário) */}
          {needsValue && (
            <div className="space-y-1.5">
              <Label htmlFor="estimated-value" className="text-xs">
                Valor estimado do orçamento
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  R$
                </span>
                <Input
                  id="estimated-value"
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={valueStr}
                  onChange={(e) => setValueStr(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && valueIsValid && !loading) handleConfirm();
                  }}
                  className="pl-9 font-mono"
                  disabled={loading}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Você pode ajustar esse valor depois dentro da proposta.
              </p>
            </div>
          )}

          {/* Aviso informativo */}
          <div className="flex gap-2.5 rounded-md border-l-2 border-accent bg-muted/40 px-3 py-2.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Vamos criar um <span className="font-medium text-foreground">rascunho de proposta</span> já vinculado a
              este deal e te levar direto para a tela de edição.
            </p>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/10 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !valueIsValid} className="gap-1.5">
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
