import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { PeriodFilter, PeriodPreset, getDateRange } from "@/components/PeriodFilter";
import { KPICard } from "@/components/KPICard";
import { SortableTableHead, SortConfig, applySorting } from "@/components/SortableTableHead";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Wallet, TrendingUp, TrendingDown, Landmark } from "lucide-react";

export default function ExtratosBancarios() {
  const [contaId, setContaId] = usePersistedState<string>("extrato_conta_id", "all");
  const [preset, setPreset] = usePersistedState<PeriodPreset>("extrato_preset", "month");
  const [customRange, setCustomRange] = usePersistedState<{ start: string | null; end: string | null }>("extrato_custom_range", { start: null, end: null });
  const [sort, setSort] = useState<SortConfig>({ key: null, direction: null });

  const { data: contas = [] } = useQuery({
    queryKey: ["contas_bancarias_extrato"],
    queryFn: async () => {
      const { data } = await supabase.from("contas_bancarias").select("id, nome, saldo_inicial, banco").eq("ativo", true).order("nome");
      return data || [];
    },
  });

  const contaSelecionada = contas.find((c) => c.id === contaId);
  const saldoInicial = contaSelecionada?.saldo_inicial ?? 0;

  const dateRange = useMemo(() => getDateRange(preset, customRange), [preset, customRange]);

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ["extrato_movimentacoes", contaId, dateRange.startDate?.toISOString(), dateRange.endDate?.toISOString()],
    queryFn: async () => {
      let q = supabase
        .from("movimentacoes")
        .select("id, descricao, tipo, valor_realizado, valor_previsto, data_pagamento, data_vencimento, status, categorias(nome)")
        .order("data_pagamento", { ascending: true, nullsFirst: false });

      if (contaId !== "all") q = q.eq("conta_bancaria_id", contaId);
      if (dateRange.startDate) q = q.gte("data_pagamento", dateRange.startDate.toISOString().split("T")[0]);
      if (dateRange.endDate) q = q.lte("data_pagamento", dateRange.endDate.toISOString().split("T")[0]);
      // Only paid transactions for bank statement
      q = q.eq("status", "pago");

      const { data } = await q;
      return data || [];
    },
    enabled: contas.length > 0,
  });

  const rows = useMemo(() => {
    const sorted = sort.key ? applySorting(movimentacoes as any[], sort) : movimentacoes;
    let saldo = contaId !== "all" ? saldoInicial : 0;
    return sorted.map((m: any) => {
      const valor = m.valor_realizado ?? m.valor_previsto ?? 0;
      const entrada = m.tipo === "receita" ? valor : 0;
      const saida = m.tipo === "despesa" ? valor : 0;
      saldo += entrada - saida;
      return { ...m, entrada, saida, saldo, categoria_nome: m.categorias?.nome ?? "—" };
    });
  }, [movimentacoes, sort, saldoInicial, contaId]);

  const totalEntradas = rows.reduce((s, r) => s + r.entrada, 0);
  const totalSaidas = rows.reduce((s, r) => s + r.saida, 0);
  const saldoFinal = rows.length > 0 ? rows[rows.length - 1].saldo : (contaId !== "all" ? saldoInicial : 0);

  return (
    <div className="space-y-6 animate-fade-slide">
      <div>
        <h1 className="text-2xl font-bold font-heading">Extratos Bancários</h1>
        <p className="text-muted-foreground text-sm">Visualize o extrato de movimentações por conta bancária</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={contaId} onValueChange={setContaId}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Selecione a conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {contas.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome} {c.banco ? `(${c.banco})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PeriodFilter preset={preset} customRange={customRange} onPresetChange={setPreset} onCustomRangeChange={setCustomRange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Saldo Inicial" value={contaId !== "all" ? saldoInicial : 0} icon={Landmark} />
        <KPICard title="Total Entradas" value={totalEntradas} icon={TrendingUp} variant="success" />
        <KPICard title="Total Saídas" value={totalSaidas} icon={TrendingDown} variant="danger" />
        <KPICard title="Saldo Final" value={saldoFinal} icon={Wallet} variant="dynamic" />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead label="Data" sortKey="data_pagamento" currentSort={sort} onSort={setSort} />
              <SortableTableHead label="Descrição" sortKey="descricao" currentSort={sort} onSort={setSort} />
              <SortableTableHead label="Categoria" sortKey="categoria_nome" currentSort={sort} onSort={setSort} />
              <SortableTableHead label="Entrada" sortKey="entrada" currentSort={sort} onSort={setSort} className="text-right" />
              <SortableTableHead label="Saída" sortKey="saida" currentSort={sort} onSort={setSort} className="text-right" />
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma movimentação encontrada para o período selecionado
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{formatDate(r.data_pagamento)}</TableCell>
                  <TableCell>{r.descricao}</TableCell>
                  <TableCell className="text-muted-foreground">{r.categoria_nome}</TableCell>
                  <TableCell className="text-right font-mono text-success">{r.entrada > 0 ? formatCurrency(r.entrada) : "—"}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">{r.saida > 0 ? formatCurrency(r.saida) : "—"}</TableCell>
                  <TableCell className={`text-right font-mono font-medium ${r.saldo >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(r.saldo)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
