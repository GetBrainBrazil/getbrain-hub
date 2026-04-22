import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import type { SerieMensalRow } from "@/hooks/useFinanceiroDashboard";

const monthLabel = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

export function EvolucaoCompetenciaChart({ data }: { data: SerieMensalRow[] }) {
  const [modo, setModo] = useState<"realizado" | "previsto">("realizado");

  const chart = data.map((r) => ({
    name: monthLabel(r.mes),
    receita: modo === "realizado" ? r.receita_realizada : r.receita_prevista,
    despesa: modo === "realizado" ? r.despesa_realizada : r.despesa_prevista,
    resultado:
      modo === "realizado"
        ? r.receita_realizada - r.despesa_realizada
        : r.receita_prevista - r.despesa_prevista,
  }));

  return (
    <Card className="animate-fade-slide">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Evolução por Competência — 12 meses</CardTitle>
        <Tabs value={modo} onValueChange={(v) => setModo(v as "realizado" | "previsto")}>
          <TabsList className="h-8">
            <TabsTrigger value="realizado" className="text-xs h-6 px-3">
              Realizado
            </TabsTrigger>
            <TabsTrigger value="previsto" className="text-xs h-6 px-3">
              Previsto
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chart} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis
              width={70}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="receita"
              name="Receita"
              fill="hsl(var(--success))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="despesa"
              name="Despesa"
              fill="hsl(var(--destructive))"
              radius={[4, 4, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="resultado"
              name="Resultado"
              stroke="hsl(var(--accent))"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "hsl(var(--accent))" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
