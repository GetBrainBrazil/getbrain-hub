import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import type { FluxoProjetadoRow } from "@/hooks/useFinanceiroDashboard";

const dayLabel = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

export function FluxoProjetadoChart({ data }: { data: FluxoProjetadoRow[] }) {
  const chart = data.map((r) => ({
    name: dayLabel(r.dia),
    saldo: r.saldo_acumulado,
  }));

  const minSaldo = Math.min(...chart.map((c) => c.saldo), 0);
  const negativo = minSaldo < 0;

  return (
    <Card className="animate-fade-slide">
      <CardHeader>
        <CardTitle className="text-base">Fluxo de Caixa Projetado — 90 dias</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chart} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              interval={Math.max(0, Math.floor(chart.length / 8))}
            />
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
            <defs>
              <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={negativo ? "hsl(var(--destructive))" : "hsl(var(--accent))"}
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor={negativo ? "hsl(var(--destructive))" : "hsl(var(--accent))"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <ReferenceLine
              y={0}
              stroke="hsl(var(--destructive))"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="saldo"
              name="Saldo Projetado"
              stroke={negativo ? "hsl(var(--destructive))" : "hsl(var(--accent))"}
              strokeWidth={2}
              fill="url(#saldoGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
