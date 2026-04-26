import { Card } from "@/components/ui/card";
import { useProposalKPIs } from "@/hooks/orcamentos/useProposalKPIs";
import { formatBRL } from "@/lib/orcamentos/calculateTotal";
import { FileText, CheckCircle2, Clock, TrendingUp } from "lucide-react";

export function OrcamentoKPICards() {
  const { data, isLoading } = useProposalKPIs();
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-5 h-[112px] animate-pulse bg-muted/30" />
        ))}
      </div>
    );
  }
  const items = [
    {
      label: "Orçado",
      value: formatBRL(data.orcadoTotal),
      sub: `${data.orcadoCount} proposta${data.orcadoCount === 1 ? "" : "s"}`,
      icon: FileText,
      tone: "text-foreground",
    },
    {
      label: "Aceito",
      value: formatBRL(data.aceitoTotal),
      sub: `${data.aceitoCount} proposta${data.aceitoCount === 1 ? "" : "s"}`,
      icon: CheckCircle2,
      tone: "text-success",
    },
    {
      label: "Em aberto",
      value: formatBRL(data.emAbertoTotal),
      sub: `${data.emAbertoCount} aguardando`,
      icon: Clock,
      tone: "text-primary",
    },
    {
      label: "Conversão",
      value: `${data.conversao.toFixed(0)}%`,
      sub: `Aceito ÷ (Aceito + Recusado)`,
      icon: TrendingUp,
      tone: "text-foreground",
    },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Card key={it.label} className="p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {it.label}
              </div>
              <Icon className={`h-4 w-4 ${it.tone}`} />
            </div>
            <div className={`text-2xl font-bold ${it.tone}`}>{it.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{it.sub}</div>
          </Card>
        );
      })}
    </div>
  );
}
