import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  generateItemDescriptionsBatch,
  estimateGenerationCostBrl,
} from "@/lib/orcamentos/generateContent";
import { formatBRL, type ScopeItem } from "@/lib/orcamentos/calculateTotal";

interface Props {
  proposalId: string;
  items: ScopeItem[];
  hasDealLink: boolean;
  disabled?: boolean;
  onDescriptionsGenerated: (updatedItems: ScopeItem[]) => void;
}

/**
 * Botão "Gerar com IA" para o card "Módulos inclusos".
 * Em uma única chamada, gera descrição curta (2-3 frases) para cada módulo
 * do escopo, baseada no contexto do deal CRM vinculado.
 */
export function GerarDescricoesIaButton({
  proposalId,
  items,
  hasDealLink,
  disabled,
  onDescriptionsGenerated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [skipExisting, setSkipExisting] = useState(true);

  const totalItems = items.length;
  const itemsWithDescription = useMemo(
    () => items.filter((it) => (it.description ?? "").trim().length > 0).length,
    [items],
  );
  const itemsToProcess = skipExisting
    ? totalItems - itemsWithDescription
    : totalItems;

  const isEmpty = totalItems === 0;
  const noItemsToProcess = itemsToProcess === 0;
  const estimatedCost = estimateGenerationCostBrl(
    "item_descriptions_batch",
    Math.max(1, itemsToProcess),
  );

  async function run() {
    setRunning(true);
    try {
      const indicesToGenerate = items
        .map((it, idx) =>
          skipExisting && (it.description ?? "").trim().length > 0 ? -1 : idx,
        )
        .filter((i) => i >= 0);

      const scopeTitles = items.map((it) => it.title ?? "");

      const result = await generateItemDescriptionsBatch({
        proposalId,
        scopeTitles,
        itemIndices: indicesToGenerate,
      });

      if (!result.descriptions || result.descriptions.length === 0) {
        toast.error("A IA não retornou descrições. Tente novamente.");
        return;
      }

      const updated = items.map((it, idx) => {
        const match = result.descriptions.find((d) => d.index === idx);
        if (!match || !match.text) return it;
        return { ...it, description: match.text.trim() };
      });

      onDescriptionsGenerated(updated);

      const generated = result.descriptions.length;
      if (result.was_filtered) {
        toast.warning(
          `${generated} descrições geradas, mas a IA tentou ${result.filter_reasons.join(
            ", ",
          )}. Revise os trechos.`,
        );
      } else {
        toast.success(
          `${generated} descrições geradas. Os módulos foram expandidos automaticamente para revisão.`,
        );
      }

      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar descrições");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || isEmpty || !proposalId}
        onClick={() => setOpen(true)}
        className="gap-1.5 h-7 text-[11px]"
        title={
          isEmpty
            ? "Adicione módulos primeiro"
            : "Gerar descrição curta para cada módulo via IA"
        }
      >
        <Sparkles className="h-3 w-3 text-accent" />
        Gerar descrições com IA
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => !running && setOpen(o)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Gerar descrições dos módulos
            </DialogTitle>
            <DialogDescription className="pt-2">
              A IA vai escrever uma descrição curta (2-3 frases) para cada
              módulo do escopo, com base{" "}
              {hasDealLink ? (
                <>
                  no <strong>contexto do deal vinculado no CRM</strong> (dor,
                  escopo, entregáveis).
                </>
              ) : (
                <em>
                  sem deal vinculado — vai gerar descrições genéricas baseadas
                  apenas no título.
                </em>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total de módulos</span>
                <span className="font-mono font-medium">{totalItems}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Já com descrição</span>
                <span className="font-mono font-medium">
                  {itemsWithDescription}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                <span className="text-foreground">Vão ser processados</span>
                <span className="font-mono font-semibold text-accent">
                  {itemsToProcess}
                </span>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={skipExisting}
                onCheckedChange={(v) => setSkipExisting(Boolean(v))}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                Pular módulos que já têm descrição{" "}
                <span className="text-muted-foreground/60">
                  (recomendado — não sobrescreve o que você já escreveu)
                </span>
              </span>
            </label>

            <p className="text-xs text-muted-foreground pt-1">
              Custo estimado:{" "}
              <strong className="font-mono">{formatBRL(estimatedCost)}</strong>
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={running}
            >
              Cancelar
            </Button>
            <Button
              onClick={run}
              disabled={running || noItemsToProcess}
              title={
                noItemsToProcess
                  ? "Nada a fazer — todos os módulos já têm descrição"
                  : undefined
              }
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Gerando…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Gerar agora
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
