import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import {
  generateProposalContent,
  estimateGenerationCostBrl,
  type GenerationType,
} from "@/lib/orcamentos/generateContent";
import { toast } from "sonner";
import { formatBRL } from "@/lib/orcamentos/calculateTotal";

interface Props {
  proposalId: string | undefined;
  hasDealLink: boolean;
  onGenerated: (
    type: GenerationType,
    content: any
  ) => void;
  disabled?: boolean;
}

const TYPE_LABELS: Record<GenerationType, { label: string; help: string }> = {
  full_content: {
    label: "Gerar tudo",
    help: "Resumo, contexto, solução e descrição de itens",
  },
  executive_summary: { label: "Só resumo executivo", help: "" },
  pain_context: { label: "Só contexto da dor", help: "" },
  solution_overview: { label: "Só visão da solução", help: "" },
  item_description: { label: "Descrições dos itens", help: "Loop por item" },
  item_descriptions_batch: {
    label: "Descrições dos módulos (lote)",
    help: "Gera descrição p/ cada módulo do escopo",
  },
};

export function GerarComIaDropdown({
  proposalId,
  hasDealLink,
  onGenerated,
  disabled,
}: Props) {
  const [pendingType, setPendingType] = useState<GenerationType | null>(null);
  const [running, setRunning] = useState(false);

  function openConfirm(t: GenerationType) {
    setPendingType(t);
  }

  async function runGeneration() {
    if (!pendingType || !proposalId) return;
    setRunning(true);
    try {
      const result = await generateProposalContent({
        proposalId,
        generationType: pendingType,
      });
      onGenerated(pendingType, result.content);
      if (result.was_filtered) {
        toast.warning(
          `Conteúdo gerado, mas a IA tentou ${result.filter_reasons.join(
            ", "
          )}. Revise manualmente os trechos marcados.`
        );
      } else {
        toast.success("Conteúdo gerado pela IA. Revise antes de enviar.");
      }
      setPendingType(null);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar conteúdo");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={disabled || !proposalId}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Gerar com IA
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {hasDealLink
              ? "Conteúdo baseado no deal vinculado"
              : "Sem deal vinculado — IA vai gerar genérico"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => openConfirm("full_content")}
            disabled={!hasDealLink}
          >
            <div className="flex flex-col">
              <span className="text-sm">{TYPE_LABELS.full_content.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {TYPE_LABELS.full_content.help}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openConfirm("executive_summary")}>
            {TYPE_LABELS.executive_summary.label}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openConfirm("pain_context")}>
            {TYPE_LABELS.pain_context.label}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openConfirm("solution_overview")}>
            {TYPE_LABELS.solution_overview.label}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openConfirm("item_description")}>
            {TYPE_LABELS.item_description.label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={pendingType !== null}
        onOpenChange={(o) => !o && !running && setPendingType(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Gerar conteúdo com IA
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span className="block">
                A IA vai gerar:{" "}
                <strong>
                  {pendingType ? TYPE_LABELS[pendingType].label : ""}
                </strong>
              </span>
              <span className="block">
                Conteúdo baseado nos dados da proposta
                {hasDealLink ? " e do deal vinculado" : ""}. Você poderá editar
                tudo depois.
              </span>
              <span className="block text-xs text-muted-foreground pt-2">
                Custo estimado:{" "}
                <strong className="font-mono">
                  {pendingType
                    ? formatBRL(estimateGenerationCostBrl(pendingType))
                    : "—"}
                </strong>
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingType(null)}
              disabled={running}
            >
              Cancelar
            </Button>
            <Button onClick={runGeneration} disabled={running}>
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Claude está
                  escrevendo…
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
