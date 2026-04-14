import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { useAuth } from "@/contexts/AuthContext";

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Tabs defaultValue="conta">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="conta">Minha Conta</TabsTrigger>
          <TabsTrigger value="contas">Contas Bancárias</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="meios">Meios Pgto</TabsTrigger>
          <TabsTrigger value="centros">Centros Custo</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        </TabsList>
        <TabsContent value="conta"><MinhaContaTab /></TabsContent>
        <TabsContent value="contas"><ContasBancariasTab /></TabsContent>
        <TabsContent value="categorias"><CategoriasTab /></TabsContent>
        <TabsContent value="meios"><MeiosPagamentoTab /></TabsContent>
        <TabsContent value="centros"><CentrosCustoTab /></TabsContent>
        <TabsContent value="fornecedores"><FornecedoresTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ContasBancariasTab() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", banco: "", agencia: "", conta: "", tipo: "corrente", saldo_inicial: "0", cor: "#3B82F6" });

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("contas_bancarias").select("*").order("nome"); setItems(data || []); }

  async function handleSave() {
    const { error } = await supabase.from("contas_bancarias").insert({
      nome: form.nome, banco: form.banco || null, agencia: form.agencia || null, conta: form.conta || null,
      tipo: form.tipo, saldo_inicial: parseFloat(form.saldo_inicial) || 0, cor: form.cor,
    });
    if (error) { toast.error("Erro"); return; }
    toast.success("Conta bancária criada!");
    setOpen(false); setForm({ nome: "", banco: "", agencia: "", conta: "", tipo: "corrente", saldo_inicial: "0", cor: "#3B82F6" }); load();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("contas_bancarias").update({ ativo: !ativo }).eq("id", id);
    load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Contas Bancárias</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Nova Conta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Conta Bancária</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Banco</Label><Input value={form.banco} onChange={e => setForm({...form, banco: e.target.value})} /></div>
                <div><Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={v => setForm({...form, tipo: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                      <SelectItem value="investimento">Investimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Agência</Label><Input value={form.agencia} onChange={e => setForm({...form, agencia: e.target.value})} /></div>
                <div><Label>Conta</Label><Input value={form.conta} onChange={e => setForm({...form, conta: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Saldo Inicial (R$)</Label><Input type="number" step="0.01" value={form.saldo_inicial} onChange={e => setForm({...form, saldo_inicial: e.target.value})} /></div>
                <div><Label>Cor</Label><Input type="color" value={form.cor} onChange={e => setForm({...form, cor: e.target.value})} className="h-10" /></div>
              </div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Cor</TableHead><TableHead>Nome</TableHead><TableHead>Banco</TableHead><TableHead>Tipo</TableHead><TableHead>Saldo Inicial</TableHead><TableHead>Ativo</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(i => (
              <TableRow key={i.id}>
                <TableCell><div className="w-4 h-4 rounded-full" style={{ backgroundColor: i.cor }} /></TableCell>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.banco || "—"}</TableCell>
                <TableCell className="text-sm capitalize">{i.tipo}</TableCell>
                <TableCell className="font-mono text-sm">{formatCurrency(Number(i.saldo_inicial))}</TableCell>
                <TableCell><Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CategoriasTab() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo: "receita" });

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("categorias").select("*").order("tipo").order("nome"); setItems(data || []); }

  async function handleSave() {
    const { error } = await supabase.from("categorias").insert({ nome: form.nome, tipo: form.tipo });
    if (error) { toast.error("Erro"); return; }
    toast.success("Categoria criada!"); setOpen(false); setForm({ nome: "", tipo: "receita" }); load();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("categorias").update({ ativo: !ativo }).eq("id", id); load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Categorias Financeiras</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Nova</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div>
              <div><Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm({...form, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Ativo</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{i.tipo}</Badge></TableCell>
                <TableCell><Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function MeiosPagamentoTab() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("meios_pagamento").select("*").order("nome"); setItems(data || []); }

  async function handleSave() {
    const { error } = await supabase.from("meios_pagamento").insert({ nome });
    if (error) { toast.error("Erro"); return; }
    toast.success("Criado!"); setOpen(false); setNome(""); load();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("meios_pagamento").update({ ativo: !ativo }).eq("id", id); load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Meios de Pagamento</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Meio de Pagamento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Ativo</TableHead></TableRow></TableHeader>
          <TableBody>{items.map(i => (
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.nome}</TableCell>
              <TableCell><Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CentrosCustoTab() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "" });

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("centros_custo").select("*").order("nome"); setItems(data || []); }

  async function handleSave() {
    const { error } = await supabase.from("centros_custo").insert({ nome: form.nome, descricao: form.descricao || null });
    if (error) { toast.error("Erro"); return; }
    toast.success("Criado!"); setOpen(false); setForm({ nome: "", descricao: "" }); load();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("centros_custo").update({ ativo: !ativo }).eq("id", id); load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Centros de Custo</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Centro de Custo</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div>
              <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Ativo</TableHead></TableRow></TableHeader>
          <TableBody>{items.map(i => (
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.nome}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{i.descricao || "—"}</TableCell>
              <TableCell><Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function FornecedoresTab() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo_pessoa: "PJ", cpf_cnpj: "", email: "", telefone: "", categoria_servico: "", observacoes: "" });

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("fornecedores").select("*").order("nome"); setItems(data || []); }

  async function handleSave() {
    const { error } = await supabase.from("fornecedores").insert({
      nome: form.nome, tipo_pessoa: form.tipo_pessoa, cpf_cnpj: form.cpf_cnpj || null,
      email: form.email || null, telefone: form.telefone || null,
      categoria_servico: form.categoria_servico || null, observacoes: form.observacoes || null,
    });
    if (error) { toast.error("Erro"); return; }
    toast.success("Fornecedor criado!"); setOpen(false);
    setForm({ nome: "", tipo_pessoa: "PJ", cpf_cnpj: "", email: "", telefone: "", categoria_servico: "", observacoes: "" }); load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Fornecedores</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo</Label>
                  <Select value={form.tipo_pessoa} onValueChange={v => setForm({...form, tipo_pessoa: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PJ">PJ</SelectItem>
                      <SelectItem value="PF">PF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>CPF/CNPJ</Label><Input value={form.cpf_cnpj} onChange={e => setForm({...form, cpf_cnpj: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} /></div>
              </div>
              <div><Label>Categoria do Serviço</Label><Input value={form.categoria_servico} onChange={e => setForm({...form, categoria_servico: e.target.value})} /></div>
              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} /></div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Categoria</TableHead><TableHead>E-mail</TableHead><TableHead>Ativo</TableHead></TableRow></TableHeader>
          <TableBody>{items.map(i => (
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.nome}</TableCell>
              <TableCell><Badge variant="outline">{i.tipo_pessoa}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{i.categoria_servico || "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{i.email || "—"}</TableCell>
              <TableCell><Badge variant="outline" className={i.ativo ? "bg-success/10 text-success" : ""}>{i.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
