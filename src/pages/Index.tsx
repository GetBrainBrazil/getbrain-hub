import { useEffect, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, BarChart3, AlertTriangle } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate, StatusType } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, Area, AreaChart } from "recharts";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ receitas: 0, despesas: 0, resultado: 0, projetosAtivos: 0, vencidas: 0 });
  const [proxVencimentos, setProxVencimentos] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // Update overdue
    await supabase.rpc("update_status_atrasado" as any);

    const now = new Date();
    const mesAtual = now.getMonth() + 1;
    const anoAtual = now.getFullYear();
    const inicioMes = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-01`;
    const fimMes = new Date(anoAtual, mesAtual, 0).toISOString().split("T")[0];

    const { data: movs } = await supabase.from("movimentacoes").select("*");
    const all = movs || [];

    const receitasMes = all.filter(m => m.tipo === "receita" && m.status === "pago" && m.data_pagamento && m.data_pagamento >= inicioMes && m.data_pagamento <= fimMes).reduce((s, m) => s + Number(m.valor_realizado), 0);
    const despesasMes = all.filter(m => m.tipo === "despesa" && m.status === "pago" && m.data_pagamento && m.data_pagamento >= inicioMes && m.data_pagamento <= fimMes).reduce((s, m) => s + Number(m.valor_realizado), 0);
    const vencidas = all.filter(m => m.status === "atrasado").length;

    const { count: projetosAtivos } = await supabase.from("projetos").select("*", { count: "exact", head: true }).eq("status", "em_andamento");

    setStats({
      receitas: receitasMes,
      despesas: despesasMes,
      resultado: receitasMes - despesasMes,
      projetosAtivos: projetosAtivos || 0,
      vencidas,
    });

    // Próximos vencimentos (5 dias)
    const hoje = now.toISOString().split("T")[0];
    const em5dias = new Date(now.getTime() + 5 * 86400000).toISOString().split("T")[0];
    const { data: proximos } = await supabase
      .from("movimentacoes")
      .select("*")
      .in("status", ["pendente"])
      .gte("data_vencimento", hoje)
      .lte("data_vencimento", em5dias)
      .order("data_vencimento")
      .limit(10);
    setProxVencimentos(proximos || []);

    // Chart data - últimos 6 meses
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - 1 - i, 1);
      const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
      const monthName = d.toLocaleDateString("pt-BR", { month: "short" });
      const rec = all.filter(m => m.tipo === "receita" && m.status === "pago" && m.data_pagamento && m.data_pagamento >= monthStart && m.data_pagamento <= monthEnd).reduce((s, m) => s + Number(m.valor_realizado), 0);
      const desp = all.filter(m => m.tipo === "despesa" && m.status === "pago" && m.data_pagamento && m.data_pagamento >= monthStart && m.data_pagamento <= monthEnd).reduce((s, m) => s + Number(m.valor_realizado), 0);
      months.push({ name: monthName, receitas: rec, despesas: desp });
    }
    setChartData(months);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate("/financeiro/receber")} className="gap-1">
            <Plus className="h-4 w-4" /> Nova Receita
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/financeiro/pagar")} className="gap-1">
            <Plus className="h-4 w-4" /> Nova Despesa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Faturamento do Mês" value={stats.receitas} icon={TrendingUp} variant="success" />
        <KPICard title="Despesas do Mês" value={stats.despesas} icon={TrendingDown} variant="danger" />
        <KPICard title="Resultado Líquido" value={stats.resultado} icon={BarChart3} variant="dynamic" />
        <KPICard title="Projetos Ativos" value={stats.projetosAtivos} icon={Wallet} isCurrency={false} />
        <KPICard title="Contas Vencidas" value={stats.vencidas} icon={AlertTriangle} variant={stats.vencidas > 0 ? "danger" : "default"} isCurrency={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-fade-slide">
          <CardHeader>
            <CardTitle className="text-base">Receitas vs Despesas — Últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--success))" radius={[4,4,0,0]} />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="animate-fade-slide">
          <CardHeader>
            <CardTitle className="text-base">Próximos Vencimentos</CardTitle>
          </CardHeader>
          <CardContent>
            {proxVencimentos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum vencimento nos próximos 5 dias 🎉</p>
            ) : (
              <div className="space-y-3">
                {proxVencimentos.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.descricao}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(m.data_vencimento)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${m.tipo === "receita" ? "text-success" : "text-destructive"}`}>
                        {m.tipo === "despesa" ? "-" : "+"}{formatCurrency(Number(m.valor_previsto))}
                      </p>
                      <StatusBadge status={m.status as StatusType} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
