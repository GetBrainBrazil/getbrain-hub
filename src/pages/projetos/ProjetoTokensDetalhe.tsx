/**
 * /projetos/:id/tokens
 *
 * Visão de consumo de IA. Bolsão real (de maintenance_contracts) já existe;
 * consumo detalhado depende de módulo futuro — usa banner "em breve".
 */
import { useParams } from "react-router-dom";
import { Brain, BarChart3, PieChart, History, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useProjetoHeader } from "@/hooks/projetos/useProjetoHeader";
import { useProjectMetrics } from "@/hooks/useProjectMetrics";
import {
  ProjetoDetalheHeader,
  type MiniKpi,
} from "@/components/projetos/detalhe/ProjetoDetalheHeader";
import {
  DetalheBloco,
  ComingSoonBlock,
} from "@/components/projetos/detalhe/DetalheBloco";

export default function ProjetoTokensDetalhe() {
  const { id: projectId = "" } = useParams<{ id: string }>();
  const { data: header } = useProjetoHeader(projectId);
  const { data: m } = useProjectMetrics(projectId);

  const budget = m?.tokens_budget_brl ?? 0;
  const consumed = m?.tokens_consumed_month_brl ?? 0;
  const restante = Math.max(0, budget - consumed);
  const pct = budget ? Math.min(100, (consumed / budget) * 100) : 0;

  const kpis: MiniKpi[] = [
    { label: "Bolsão", value: formatCurrency(budget) },
    {
      label: "Consumido",
      value: formatCurrency(consumed),
      hint: budget ? `${pct.toFixed(0)}%` : undefined,
      tone: pct >= 80 ? "warning" : "default",
    },
    { label: "Restante", value: formatCurrency(restante), tone: "success" },
    { label: "% usado", value: `${pct.toFixed(0)}%`, tone: pct >= 80 ? "warning" : "accent" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <ProjetoDetalheHeader
        projectId={projectId}
        projectCode={header?.code}
        projectName={header?.name}
        companyName={header?.company_name}
        title="Visão de Tokens de IA"
        subtitle="Consumo, projeção e distribuição por modelo"
        kpis={kpis}
      />

      <DetalheBloco icon={BarChart3} title="Consumo do mês">
        {budget > 0 ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Consumido / Bolsão</span>
              <span className="font-mono text-base tabular-nums">
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(consumed)}
                </span>
                <span className="text-muted-foreground"> / {formatCurrency(budget)}</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  pct >= 80 ? "bg-warning" : "bg-accent",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <ComingSoonBlock message="Em breve: gráfico diário de consumo de tokens, com picos por hora e destaque de eventos." />
          </div>
        ) : (
          <ComingSoonBlock message="Configure um bolsão de tokens no contrato ativo do projeto para começar a acompanhar o consumo." />
        )}
      </DetalheBloco>

      <DetalheBloco icon={PieChart} title="Distribuição por modelo / agente">
        <ComingSoonBlock message="Quebra do consumo por modelo (Gemini, GPT, Claude…) e por agente, identificando onde o investimento em tokens está sendo feito." />
      </DetalheBloco>

      <DetalheBloco icon={History} title="Histórico mensal">
        <ComingSoonBlock message="Consumo mês a mês para identificar tendência de uso e justificar reajustes do bolsão." />
      </DetalheBloco>

      <DetalheBloco icon={TrendingUp} title="Projeção de estouro">
        <ComingSoonBlock message="Projeção do consumo até o fim do mês baseada na taxa atual, sinalizando risco de exceder o bolsão." />
      </DetalheBloco>
    </div>
  );
}
