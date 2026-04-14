import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate, StatusType } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Transacoes() {
  const [movs, setMovs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("movimentacoes").select("*, clientes(nome), fornecedores(nome), categorias(nome), projetos(nome)").order("data_vencimento", { ascending: false });
    setMovs(data || []);
  }

  const filtered = movs.filter(m => {
    if (tipoFilter !== "todos" && m.tipo !== tipoFilter) return false;
    if (statusFilter !== "todos" && m.status !== statusFilter) return false;
    if (search && !m.descricao.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalReceitas = filtered.filter(m => m.tipo === "receita").reduce((s, m) => s + Number(m.valor_previsto), 0);
  const totalDespesas = filtered.filter(m => m.tipo === "despesa").reduce((s, m) => s + Number(m.valor_previsto), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transações</h1>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Cliente/Fornecedor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma transação encontrada</TableCell></TableRow>
                ) : filtered.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{formatDate(m.data_vencimento)}</TableCell>
                    <TableCell className="text-sm font-medium">{m.descricao}</TableCell>
                    <TableCell className="text-sm capitalize">{m.tipo}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(m.categorias as any)?.nome || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(m.clientes as any)?.nome || (m.fornecedores as any)?.nome || "—"}</TableCell>
                    <TableCell className={`text-right font-mono text-sm font-semibold ${m.tipo === "receita" ? "text-success" : "text-destructive"}`}>
                      {m.tipo === "despesa" ? "-" : "+"}{formatCurrency(Number(m.valor_previsto))}
                    </TableCell>
                    <TableCell><StatusBadge status={m.status as StatusType} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between pt-4 border-t mt-4 text-sm font-medium">
            <span>Total Receitas: <span className="text-success font-mono">{formatCurrency(totalReceitas)}</span></span>
            <span>Total Despesas: <span className="text-destructive font-mono">{formatCurrency(totalDespesas)}</span></span>
            <span>Saldo: <span className={`font-mono ${totalReceitas - totalDespesas >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(totalReceitas - totalDespesas)}</span></span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
