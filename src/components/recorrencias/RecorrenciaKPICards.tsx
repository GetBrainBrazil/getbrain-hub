import { KpiCard } from "@/components/dashboard/KpiCard";
import { useRecurrenceKPIs } from "@/hooks/recorrencias/useRecurrenceKPIs";
import { formatCurrency } from "@/lib/formatters";

export function RecorrenciaKPICards() {
  const { data, isLoading } = useRecurrenceKPIs();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        label="MRR Ativo"
        value={isLoading ? "…" : formatCurrency(data?.mrrAtivo ?? 0)}
        sparkData={data?.sparkMrr}
        hint="Receita recorrente mensal"
        loading={isLoading}
      />
      <KpiCard
        label="Custo Fixo Mensal"
        value={isLoading ? "…" : formatCurrency(data?.custoFixoMensal ?? 0)}
        sparkData={data?.sparkCusto}
        hint="Despesas recorrentes ativas"
        goodWhen="down"
        loading={isLoading}
      />
      <KpiCard
        label="Próximos 7 dias"
        value={isLoading ? "…" : formatCurrency(data?.proximos7Dias.total ?? 0)}
        hint={`${data?.proximos7Dias.count ?? 0} ${data?.proximos7Dias.count === 1 ? "item" : "itens"}`}
        loading={isLoading}
      />
      <KpiCard
        label="Recorrências Ativas"
        value={isLoading ? "…" : (data?.ativas ?? 0)}
        hint="Séries gerando parcelas"
        loading={isLoading}
      />
    </div>
  );
}
