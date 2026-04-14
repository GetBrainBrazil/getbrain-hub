import { useEffect, useState } from "react";
import { Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  em_andamento: "Em andamento",
  concluido: "Concluído",
  pausado: "Pausado",
  cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  em_andamento: "bg-accent/10 text-accent border-accent/20",
  concluido: "bg-success/10 text-success border-success/20",
  pausado: "bg-warning/10 text-warning border-warning/20",
  cancelado: "bg-muted text-muted-foreground border-border",
};

export default function Projetos() {
  const [projetos, setProjetos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", cliente_id: "", descricao: "", valor_contrato: "", data_inicio: "", data_fim: "", status: "em_andamento" });

  useEffect(() => { load(); }, []);

  async function load() {
    const [r1, r2] = await Promise.all([
      supabase.from("projetos").select("*, clientes(nome)").order("created_at", { ascending: false }),
      supabase.from("clientes").select("*").eq("ativo", true),
    ]);
    setProjetos(r1.data || []);
    setClientes(r2.data || []);
  }

  async function handleSave() {
    const { error } = await supabase.from("projetos").insert({
      nome: form.nome,
      cliente_id: form.cliente_id || null,
      descricao: form.descricao || null,
      valor_contrato: form.valor_contrato ? parseFloat(form.valor_contrato) : null,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      status: form.status,
    });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Projeto criado!");
    setOpen(false);
    setForm({ nome: "", cliente_id: "", descricao: "", valor_contrato: "", data_inicio: "", data_fim: "", status: "em_andamento" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projetos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" /> Novo Projeto</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div>
              <div><Label>Cliente</Label>
                <Select value={form.cliente_id} onValueChange={v => setForm({...form, cliente_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></div>
              <div><Label>Valor do Contrato (R$)</Label><Input type="number" step="0.01" value={form.valor_contrato} onChange={e => setForm({...form, valor_contrato: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data Início</Label><Input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} /></div>
                <div><Label>Data Fim</Label><Input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} /></div>
              </div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {projetos.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum projeto cadastrado</h3>
          <p className="text-muted-foreground mb-4">Crie seu primeiro projeto para começar a gerenciar.</p>
          <Button onClick={() => setOpen(true)}>Criar Projeto</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projetos.map(p => (
            <Card key={p.id} className="animate-fade-slide hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{p.nome}</CardTitle>
                  <Badge variant="outline" className={statusColors[p.status]}>{statusLabels[p.status]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{(p.clientes as any)?.nome || "Sem cliente"}</p>
              </CardHeader>
              <CardContent>
                {p.valor_contrato && (
                  <p className="text-lg font-mono font-bold mb-2">{formatCurrency(Number(p.valor_contrato))}</p>
                )}
                {p.data_inicio && (
                  <p className="text-xs text-muted-foreground">{formatDate(p.data_inicio)} {p.data_fim ? `— ${formatDate(p.data_fim)}` : ""}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
