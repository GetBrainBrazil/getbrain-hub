import { TipoVenda, VendaStatus } from "@/hooks/useVendas";

export const TIPO_VENDA_LABEL: Record<TipoVenda, string> = {
  implementacao: "Implementação",
  recorrente: "Recorrente",
  avulso: "Avulso",
};

export const VENDA_STATUS_LABEL: Record<VendaStatus, string> = {
  rascunho: "Rascunho",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

export function getVendaStatusClasses(status: VendaStatus): string {
  switch (status) {
    case "confirmada":
      return "bg-success/10 text-success border-success/20";
    case "rascunho":
      return "bg-muted text-muted-foreground border-border";
    case "cancelada":
      return "bg-destructive/10 text-destructive border-destructive/20";
  }
}

export function getTipoVendaClasses(tipo: TipoVenda): string {
  switch (tipo) {
    case "implementacao":
      return "bg-accent/15 text-accent border-accent/30";
    case "recorrente":
      return "bg-primary/15 text-primary border-primary/30";
    case "avulso":
      return "bg-warning/15 text-warning border-warning/30";
  }
}
