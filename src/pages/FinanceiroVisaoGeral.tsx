import { useEffect, useState } from "react";
import { Wallet, TrendingUp, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";

export default function FinanceiroVisaoGeral() {
  const [kpis, setKpis] = useState({ saldo: 0, aReceber: 0, aPagar: 0, resultado: 0 });
  const [vencidas, setVencidas] = useState(0);
  const [valorVencido, setValorVencido] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [fluxoData, setFluxoData] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    await supabase.rpc("update_status_atrasado" as any);

    const now = new Date();
    const mesAtual = now.getMonth() + 1;
    const anoAtual = now.getFullYear();
    const inicioMes = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-01`;
    const fimMes = new Date(anoAtual, mesAtual, 0).toISOString().split("T")[0];

    const { data: contasBanc } = await supabase.from("contas_bancarias").select("*").eq("ativo", true);
    const { data: movs } = await supabase.from("movimentacoes").select("*");
    const all = movs || [];
    const cb = contasBanc || [];

    // Saldo total
    const contasComSaldo = cb.map(c => {
      const recPagas = all.filter(m => m.tipo === "receita" && m.status === "pago" && m.conta_bancaria_id === c.id).reduce((s, m) => s + Number(m.valor_realizado), 0);
      const despPagas = all.filter(m => m.tipo === "despesa" && m.status === "pago" && m.conta_bancaria_id === c.id).reduce((s, m) => s + Number(m.valor_realizado), 0);
      return { ...c, saldo: Number(c.saldo_inicial) + recPagas - despPagas };
    });

    const saldoTotal = contasComSaldo.reduce((s, c) => s + c.saldo, 0);
    const aReceber = all.filter(m => m.tipo === "receita" && m.status === "pendente").reduce((s, m) => s + Number(m.valor_previsto), 0);
    const aPagar = all.filter(m => m.tipo === "despesa" && m.status === "pendente").reduce((s, m) => s + Number(m.valor_previsto), 0);
    const recMes = all.filter(m => m.tipo === "receita" && m.status === "pago" && m.data_pagamento && m.data_pagamento >= inicioMes && m.data_pagamento <= fimMes).reduce((s, m) => s + Number(m.valor_realizado), 0);
    const despMes = all.filter(m => m.tipo === "despesa" && m.status === "pago" && m.data_pagamento && m.data_pagamento >= inicioMes && m.data_pagamento <= fimMes).reduce((s, m) => s + Number(m.valor_realizado), 0);
    
    const atrasadas = all.filter(m => m.status === "atrasado");
    const venc = atrasadas.length;
    const vlrVencido = atrasadas.filter(m => m.tipo === "despesa").reduce((s, m) => s + Number(m.valor_previsto), 0);

    setKpis({ saldo: saldoTotal, aReceber, aPagar, resultado: recMes - despMes });
    setVencidas(venc);
    setValorVencido(vlrVencido);

    // 12 meses chart
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - 1 - i, 1);
      const mS = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const mE = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
      const nm = d.toLocaleDateString("pt-BR", { month: "short" });
      const r = all.filter(m => m.tipo === "receita" && m.status === "pago" && m.data_pagamento && m.data_pagamento >= mS && m.data_pagamento <= mE).reduce((s, m) => s + Number(m.valor_realizado), 0);
      const dp = all.filter(m => m.tipo === "despesa" && m.status === "pago" && m.data_pagamento && m.data_pagamento >= mS && m.data_pagamento <= mE).reduce((s, m) => s + Number(m.valor_realizado), 0);
      months.push({ name: nm, receitas: r, despesas: dp });
    }
    setChartData(months);

    // Fluxo de caixa projetado — próximos 60 dias
    const hoje = new Date();
    const pendentes = all.filter(m => m.status === "pendente" || m.status === "atrasado");
    const fluxo: any[] = [];
    let saldoAcumulado = saldoTotal;

    for (let i = 0; i <= 60; i += 5) {
      const dia = new Date(hoje);
      dia.setDate(dia.getDate() + i);
      const diaStr = dia.toISOString().split("T")[0];
      const label = dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

      // Movs pendentes com vencimento até esse dia
      const recAte = pendentes.filter(m => m.tipo === "receita" && m.data_vencimento <= diaStr).reduce((s, m) => s + Number(m.valor_previsto), 0);
      const despAte = pendentes.filter(m => m.tipo === "despesa" && m.data_vencimento <= diaStr).reduce((s, m) => s + Number(m.valor_previsto), 0);

      fluxo.push({
        name: label,
        saldo: saldoAcumulado + recAte - despAte,
      });
    }
    setFluxoData(fluxo);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Visão Geral Financeira</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Saldo Total" value={kpis.saldo} icon={Wallet} />
        <KPICard title="Resultado do Período" value={kpis.resultado} icon={TrendingUp} variant="dynamic" />
        <KPICard title="A Receber" value={kpis.aReceber} icon={ArrowUpCircle} variant="success" />
        <KPICard
          title="A Pagar"
          value={kpis.aPagar}
          icon={ArrowDownCircle}
          variant="danger"
          badgeText={valorVencido > 0 ? `${formatCurrency(valorVencido)} vencido` : undefined}
          badgeVariant="danger"
        />
      </div>

      {/* Alertas */}
      {vencidas > 0 && (
        <Card className="border-l-4 border-l-warning border-warning/30 bg-warning/5 animate-fade-slide">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-semibold">Alertas e Avisos</p>
                <p className="text-xs text-muted-foreground">{vencidas} conta(s) a pagar atrasada(s)</p>
              </div>
            </div>
            <span className="font-mono text-sm font-bold text-warning">{formatCurrency(valorVencido)}</span>
          </CardContent>
        </Card>
      )}

      {/* Charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-fade-slide">
          <CardHeader>
            <CardTitle className="text-base">Evolução Mensal — Últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
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
            <CardTitle className="text-base">Fluxo de Caixa Projetado — 60 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={fluxoData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <defs>
                  <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo Projetado"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  fill="url(#saldoGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}