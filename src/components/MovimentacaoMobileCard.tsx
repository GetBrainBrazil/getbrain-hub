/**
 * Card mobile para uma movimentação financeira.
 * Substitui a linha da tabela em telas < md.
 * Mantém todas as ações (selecionar, abrir dropdown, navegar para detalhe).
 */
import { Building2, MoreHorizontal, CheckCircle, Pencil, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate, type StatusType } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Props {
  m: any;
  isPagar: boolean;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onLiquidar: () => void;
  onEditar: () => void;
  onDuplicar: () => void;
  onExcluir: () => void;
  vinculadoNome: string;
  vinculadoBadge?: string | null;
}

export function MovimentacaoMobileCard({
  m,
  isPagar,
  selected,
  onSelect,
  onClick,
  onLiquidar,
  onEditar,
  onDuplicar,
  onExcluir,
  vinculadoNome,
  vinculadoBadge,
}: Props) {
  const valueColor = isPagar ? "text-destructive" : "text-success";
  const valorPrevisto = Number(m.valor_previsto) || 0;
  const valorPago = Number(m.valor_realizado) || 0;
  const isPartial = m.status === "pago" && valorPago > 0 && valorPago < valorPrevisto;

  return (
    <div
      className="relative flex flex-col gap-2 border-b border-border/60 px-4 py-3 last:border-0 transition-colors active:bg-muted/40"
      onClick={onClick}
      role="button"
    >
      {/* Linha 1: checkbox + vinculado + valor */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          aria-label={`Selecionar movimentação ${m.descricao}`}
          checked={selected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 h-4 w-4 appearance-none rounded-full border border-input bg-background cursor-pointer transition-colors checked:border-primary checked:bg-primary checked:bg-[radial-gradient(circle,hsl(var(--primary-foreground))_35%,transparent_40%)] shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">
              {vinculadoNome}
            </span>
            {vinculadoBadge && (
              <span className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 text-[9px] font-semibold text-muted-foreground leading-4 shrink-0">
                {vinculadoBadge}
              </span>
            )}
          </div>
          <p className="text-sm text-foreground mt-0.5 truncate">{m.descricao}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {(m.categorias as any)?.nome || "Sem categoria"}
          </p>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className={cn("text-sm font-semibold font-mono", valueColor)}>
            {formatCurrency(valorPrevisto)}
          </span>
          {isPartial && (
            <span className="text-[10px] text-muted-foreground mt-0.5">
              Real: {formatCurrency(valorPago)}
            </span>
          )}
        </div>
      </div>

      {/* Linha 2: status + datas + menu */}
      <div className="flex items-center justify-between gap-2 pl-6">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <StatusBadge status={m.status as StatusType} className="rounded-full px-2 py-0.5 text-[10px]" />
          <span className="text-[11px] text-muted-foreground">
            Venc: <span className="text-foreground">{formatDate(m.data_vencimento)}</span>
          </span>
          {m.data_pagamento && (
            <span className="text-[11px] text-muted-foreground">
              {isPagar ? "Pago" : "Receb"}: <span className="text-foreground">{formatDate(m.data_pagamento)}</span>
            </span>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 -mr-2 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {m.status !== "pago" ? (
                <DropdownMenuItem onClick={onLiquidar} className="cursor-pointer">
                  <CheckCircle className="mr-2 h-4 w-4 text-success" />
                  Liquidar Conta
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onLiquidar} className="cursor-pointer">
                  <CheckCircle className="mr-2 h-4 w-4 text-success" />
                  Editar Liquidação
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onEditar} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicar} className="cursor-pointer">
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExcluir} className="cursor-pointer text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
