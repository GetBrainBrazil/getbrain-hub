import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Copy, Download, Send, Check, X, Trash2 } from "lucide-react";
import { OrcamentoStatusBadge } from "./OrcamentoStatusBadge";
import {
  calculateScopeTotal,
  effectiveStatus,
  formatBRL,
  formatDateBR,
} from "@/lib/orcamentos/calculateTotal";
import type { ProposalRow } from "@/hooks/orcamentos/useProposals";

interface Props {
  rows: ProposalRow[];
  loading?: boolean;
  onAction: (
    row: ProposalRow,
    action: "edit" | "duplicate" | "download" | "mark-sent" | "mark-accepted" | "mark-rejected" | "delete"
  ) => void;
  /** Click na linha — se ausente, navega pro editor por padrão. */
  onRowClick?: (row: ProposalRow) => void;
}

export function OrcamentoTabela({ rows, loading, onAction, onRowClick }: Props) {
  const navigate = useNavigate();

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>;
  }
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Código</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="w-[140px]">Origem</TableHead>
            <TableHead className="text-right w-[130px]">Total</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[110px]">Validade</TableHead>
            <TableHead className="w-[110px]">Criado</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const total = calculateScopeTotal(r.scope_items);
            const eff = effectiveStatus(r.status, r.valid_until);
            return (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() =>
                  onRowClick
                    ? onRowClick(r)
                    : navigate(`/financeiro/orcamentos/${r.id}/editar`)
                }
              >
                <TableCell className="font-mono font-semibold text-xs">
                  {r.code}
                </TableCell>
                <TableCell className="font-medium">{r.client_company_name}</TableCell>
                <TableCell>
                  {r.deal?.code ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                      Deal {r.deal.code}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      Manual
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(total)}
                </TableCell>
                <TableCell>
                  <OrcamentoStatusBadge status={eff} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateBR(r.valid_until)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateBR(r.created_at.slice(0, 10))}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onAction(r, "edit")}>
                        <Pencil className="h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction(r, "duplicate")}>
                        <Copy className="h-4 w-4" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction(r, "download")}>
                        <Download className="h-4 w-4" /> Baixar PDF
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {r.status === "rascunho" && (
                        <DropdownMenuItem onClick={() => onAction(r, "mark-sent")}>
                          <Send className="h-4 w-4" /> Marcar como enviado
                        </DropdownMenuItem>
                      )}
                      {r.status === "enviada" && (
                        <>
                          <DropdownMenuItem onClick={() => onAction(r, "mark-accepted")}>
                            <Check className="h-4 w-4 text-success" /> Marcar como aceito
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAction(r, "mark-rejected")}>
                            <X className="h-4 w-4 text-destructive" /> Marcar como recusado
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onAction(r, "delete")}
                      >
                        <Trash2 className="h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
