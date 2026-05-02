/**
 * Pipeline horizontal dos stages da PROPOSTA (não confundir com stages de deal).
 *
 * Reaproveita a estética do `StageStepper` do CRM (CrmDetailShared.tsx) mas
 * adaptada para os 6 estados de proposta:
 *   Rascunho → Enviada → Visualizada → Aceita (= convertida) → Recusada → Convertida
 *
 * Comportamento:
 *  - Stage atual destacado.
 *  - Stages "concluídos" (na linha do tempo natural do funil) marcados com check.
 *  - Stages "futuros" em cinza-borda.
 *  - Cliques apenas mostram tooltip — transições são automáticas via gatilhos
 *    no fluxo (gerar e enviar, view tracking, manifestação de interesse, etc.).
 *  - "Recusada" e "Convertida" são finalizações: aparecem ao lado, separadas por
 *    divider vertical, no estilo destrutivo / sucesso respectivamente.
 *  - Quando a proposta está num estado terminal, mostra um aviso abaixo.
 *
 * Sem dependências externas — só shadcn/ui (Tooltip) + Tailwind tokens.
 */
import { Check, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ProposalStatus } from "@/lib/orcamentos/calculateTotal";

/** Etapas em progresso, na ordem temporal natural do funil de proposta. */
const PROGRESS_STAGES = [
  "rascunho",
  "enviada",
  "visualizada",
  "interesse_manifestado",
] as const;

/** Etapas terminais — sempre visíveis no fim do stepper. */
const CLOSED_STAGES = ["convertida", "recusada"] as const;

const STAGE_LABEL: Record<ProposalStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  visualizada: "Visualizada",
  interesse_manifestado: "Com interesse",
  expirada: "Expirada",
  convertida: "Convertida",
  recusada: "Recusada",
};

const STAGE_HINT: Record<ProposalStatus, string> = {
  rascunho: "Em edição interna — ainda não enviada ao cliente.",
  enviada: "Disponível ao cliente via link público.",
  visualizada: "O cliente já abriu a proposta.",
  interesse_manifestado: "O cliente clicou em 'Tenho interesse' na página pública.",
  expirada: "A data de validade venceu — estenda para reativar o link.",
  convertida: "Proposta fechada como ganha — virou projeto.",
  recusada: "O cliente recusou. Mantém histórico para futuras versões.",
};

interface Props {
  /** Status efetivo da proposta (já considera 'expirada'). */
  status: ProposalStatus;
}

export function ProposalStagePipeline({ status }: Props) {
  const isExpired = status === "expirada";
  // Para fins de stepper, expirada = enviada (já passou da fase rascunho).
  const stageForProgress: (typeof PROGRESS_STAGES)[number] | "convertida" | "recusada" =
    isExpired ? "enviada" : (status as any);

  const progressIndex = PROGRESS_STAGES.indexOf(stageForProgress as any);
  const isClosed = (CLOSED_STAGES as readonly string[]).includes(status);

  const renderStep = (
    s: ProposalStatus,
    opts: { isDone: boolean; isCurrent: boolean; kind: "progress" | "won" | "lost" },
  ) => {
    const { isDone, isCurrent, kind } = opts;
    const isFuture = !isDone && !isCurrent;
    const isWon = kind === "won";
    const isLost = kind === "lost";

    return (
      <Tooltip key={s}>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "group flex flex-1 flex-col items-center gap-1.5 rounded-md px-2 py-2 text-center transition cursor-default",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                kind === "progress" && isDone && "border-accent bg-accent text-accent-foreground",
                kind === "progress" && isCurrent && "border-accent bg-accent text-accent-foreground ring-4 ring-accent/20",
                kind === "progress" && isFuture && "border-border bg-background",
                isWon && isCurrent && "border-success bg-success text-success-foreground ring-4 ring-success/20",
                isWon && !isCurrent && "border-success/40 bg-background text-success",
                isLost && isCurrent && "border-destructive bg-destructive text-destructive-foreground ring-4 ring-destructive/20",
                isLost && !isCurrent && "border-destructive/40 bg-background text-destructive",
              )}
            >
              {kind === "progress" && isDone && <Check className="h-3 w-3" strokeWidth={3} />}
              {isWon && <Check className="h-3 w-3" strokeWidth={3} />}
              {isLost && <X className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span
              className={cn(
                "text-[11px] leading-tight transition",
                isCurrent && "font-semibold text-foreground",
                isDone && "text-foreground/80",
                isFuture && "text-muted-foreground",
                isWon && !isCurrent && "text-success/80",
                isLost && !isCurrent && "text-destructive/80",
              )}
            >
              {STAGE_LABEL[s]}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px]">
          <p className="font-medium">{STAGE_LABEL[s]}</p>
          <p className="text-xs text-muted-foreground">{STAGE_HINT[s]}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex w-full min-w-0 items-stretch gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {PROGRESS_STAGES.map((s, i) => {
          const isDone = progressIndex >= 0 && i < progressIndex;
          const isCurrent = i === progressIndex && !isClosed;
          const showConnector = i < PROGRESS_STAGES.length - 1;
          return (
            <div key={s} className="flex flex-1 min-w-[110px] items-start gap-1">
              {renderStep(s as ProposalStatus, { isDone, isCurrent, kind: "progress" })}
              {showConnector && (
                <span
                  className={cn(
                    "mt-[14px] h-1 flex-1 min-w-[16px] rounded-full transition",
                    i < progressIndex ? "bg-accent" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}

        {/* Separador entre etapas em progresso e terminais */}
        <div className="mx-1 flex shrink-0 items-stretch" aria-hidden>
          <div className="my-1 w-px bg-border/60" />
        </div>

        {CLOSED_STAGES.map((s) => (
          <div key={s} className="flex shrink-0 min-w-[100px] items-start">
            {renderStep(s as ProposalStatus, {
              isDone: false,
              isCurrent: status === s,
              kind: s === "convertida" ? "won" : "lost",
            })}
          </div>
        ))}
      </div>

      {isClosed && (
        <p
          className={cn(
            "mt-1 text-xs",
            status === "convertida" ? "text-success" : "text-destructive",
          )}
        >
          Proposta {STAGE_LABEL[status]}. {STAGE_HINT[status]}
        </p>
      )}
      {isExpired && (
        <p className="mt-1 text-xs text-amber-500">
          Validade vencida — o link público não responde mais até estender a data.
        </p>
      )}
    </TooltipProvider>
  );
}
