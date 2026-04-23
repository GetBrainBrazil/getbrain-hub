import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useVendaDetail, useConfirmVenda, useCancelVenda } from "@/hooks/useVendas";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, StatusType } from "@/lib/formatters";
import { TIPO_VENDA_LABEL, VENDA_STATUS_LABEL, getVendaStatusClasses, getTipoVendaClasses } from "@/lib/vendas-helpers";
import { Link } from "react-router-dom";
import { ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  vendaId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function VendaDrawer({ vendaId, open, onOpenChange }: Props) {
  const { data: venda, isLoading } = useVendaDetail(vendaId);
  const confirmMut = useConfirmVenda();
  const cancelMut = useCancelVenda();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{venda?.numero || "Venda"}</SheetTitle>
        </SheetHeader>

        {isLoading && <div className="py-8 text-center text-muted-foreground">Carregando...</div>}

        {venda && (
          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={cn(getVendaStatusClasses(venda.status))}>
                {VENDA_STATUS_LABEL[venda.status]}
              </Badge>
              <Badge variant="outline" className={cn(getTipoVendaClasses(venda.tipo_venda))}>
                {TIPO_VENDA_LABEL[venda.tipo_venda]}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Valor total</div>
                <div className="font-semibold text-base">{formatCurrency(Number(venda.valor_total))}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Data da venda</div>
                <div>{formatDate(venda.data_venda)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Projeto</div>
                <Link to={`/projetos/${venda.project_id}`} className="text-accent hover:underline inline-flex items-center gap-1">
                  {(venda as any).project?.code || "—"} <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cliente</div>
                <div>{(venda as any).cliente?.nome || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Parcelas</div>
                <div>{venda.quantidade_parcelas}x</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">1ª parcela</div>
                <div>{venda.data_primeira_parcela ? formatDate(venda.data_primeira_parcela) : "—"}</div>
              </div>
            </div>

            {venda.observacoes && (
              <div className="text-sm">
                <div className="text-xs text-muted-foreground mb-1">Observações</div>
                <div className="bg-muted/40 rounded-md p-2">{venda.observacoes}</div>
              </div>
            )}

            <Separator />

            <div>
              <div className="text-sm font-semibold mb-2">Parcelas ({(venda as any).parcelas?.length || 0})</div>
              <div className="space-y-2">
                {((venda as any).parcelas || []).map((p: any) => (
                  <Link
                    key={p.id}
                    to={`/financeiro/movimentacoes/${p.id}`}
                    className="flex items-center justify-between p-2 rounded-md border border-border hover:bg-muted/40 transition"
                  >
                    <div className="text-sm">
                      <div className="font-medium">{p.descricao}</div>
                      <div className="text-xs text-muted-foreground">Venc: {formatDate(p.data_vencimento)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatCurrency(Number(p.valor_realizado || p.valor_previsto))}</span>
                      <Badge variant="outline" className={cn("text-[10px]", getStatusColor(p.status as StatusType))}>
                        {getStatusLabel(p.status as StatusType)}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {((venda as any).parcelas || []).length === 0 && (
                  <div className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-md">
                    Nenhuma parcela gerada ainda. Confirme a venda para gerar.
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              {venda.status === "rascunho" && (
                <Button onClick={() => confirmMut.mutate(venda.id)} disabled={confirmMut.isPending}>
                  <CheckCircle2 className="h-4 w-4" /> Confirmar venda
                </Button>
              )}
              {venda.status !== "cancelada" && (
                <Button variant="outline" onClick={() => cancelMut.mutate(venda.id)} disabled={cancelMut.isPending}>
                  <XCircle className="h-4 w-4" /> Cancelar venda
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
