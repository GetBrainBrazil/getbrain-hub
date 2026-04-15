import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { usePersistedState } from "@/hooks/use-persisted-state";

const tabConfig = {
  contas: { label: "Contas Bancárias", button: "+ Nova Conta" },
  plano: { label: "Plano de Contas", button: "+ Novo Plano" },
  clientes: { label: "Clientes", button: "+ Novo Cliente" },
  fornecedores: { label: "Fornecedores", button: "+ Novo Fornecedor" },
  centros: { label: "Centros de Custo", button: "+ Novo Centro" },
  categorias: { label: "Categorias", button: "+ Nova" },
};

type TabKey = keyof typeof tabConfig;

export default function ConfiguracoesFinanceiras() {
  const [activeTab, setActiveTab] = usePersistedState<TabKey>("fin_config_tab", "contas");
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações Financeiras</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie contas, categorias, clientes, fornecedores e centros de custo</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabKey); setSearch(""); }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            {Object.entries(tabConfig).map(([key, cfg]) => (
              <TabsTrigger key={key} value={key}>{cfg.label}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="contas"><ContasBancariasTab search={search} /></TabsContent>
        <TabsContent value="plano"><PlanoContasTab search={search} /></TabsContent>
        <TabsContent value="clientes"><ClientesTab search={search} /></TabsContent>
        <TabsContent value="fornecedores"><FornecedoresTab search={search} /></TabsContent>
        <TabsContent value="centros"><CentrosCustoTab search={search} /></TabsContent>
        <TabsContent value="categorias"><CategoriasTab search={search} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Contas Bancárias ─── */
function ContasBancariasTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", banco: "", agencia: "", conta: "", tipo: "corrente", saldo_inicial: "0", moeda: "BRL" });

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("contas_bancarias").select("*").order("nome"); setItems(data || []); }

  const filtered = items.filter(i => !search || i.nome.toLowerCase().includes(search.toLowerCase()) || (i.banco || "").toLowerCase().includes(search.toLowerCase()));

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const { error } = await supabase.from("contas_bancarias").insert({
      nome: form.nome, banco: form.banco || null, agencia: form.agencia || null, conta: form.conta || null,
      tipo: form.tipo, saldo_inicial: parseFloat(form.saldo_inicial) || 0, moeda: form.moeda,
    });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Conta bancária criada!");
    setOpen(false); setForm({ nome: "", banco: "", agencia: "", conta: "", tipo: "corrente", saldo_inicial: "0", moeda: "BRL" }); load();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("contas_bancarias").update({ ativo: !ativo }).eq("id", id); load();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-end mb-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Nova Conta</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Conta Bancária</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Banco</Label><Input value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} /></div>
                  <div><Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
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
                  <div><Label>Agência</Label><Input value={form.agencia} onChange={e => setForm({ ...form, agencia: e.target.value })} /></div>
                  <div><Label>Conta</Label><Input value={form.conta} onChange={e => setForm({ ...form, conta: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Saldo Inicial</Label><Input type="number" step="0.01" value={form.saldo_inicial} onChange={e => setForm({ ...form, saldo_inicial: e.target.value })} /></div>
                  <div><Label>Moeda</Label>
                    <Select value={form.moeda} onValueChange={v => setForm({ ...form, moeda: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">Real (R$)</SelectItem>
                        <SelectItem value="USD">Dólar (US$)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Cor</TableHead><TableHead>Nome</TableHead><TableHead>Banco</TableHead><TableHead>Tipo</TableHead><TableHead>Saldo Inicial</TableHead><TableHead>Ativo</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell><div className="w-4 h-4 rounded-full" style={{ backgroundColor: i.cor }} /></TableCell>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.banco || "—"}</TableCell>
                <TableCell className="text-sm capitalize">{i.tipo}</TableCell>
                <TableCell className="text-sm">{formatCurrency(Number(i.saldo_inicial))}</TableCell>
                <TableCell><Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma conta bancária encontrada</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ─── Plano de Contas ─── */
function PlanoContasTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo: "receita" });

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("categorias").select("*").order("tipo").order("nome"); setItems(data || []); }

  const filtered = items.filter(i => !search || i.nome.toLowerCase().includes(search.toLowerCase()));

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const { error } = await supabase.from("categorias").insert({ nome: form.nome, tipo: form.tipo });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Plano de contas criado!"); setOpen(false); setForm({ nome: "", tipo: "receita" }); load();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("categorias").update({ ativo: !ativo }).eq("id", id); load();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-end mb-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Plano</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Plano de Contas</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div><Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
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
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Natureza</TableHead><TableHead>Ativo</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{i.tipo}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.tipo === "receita" ? "Crédito" : i.tipo === "despesa" ? "Débito" : "Ambos"}</TableCell>
                <TableCell><Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum plano encontrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ─── Clientes ─── */
function ClientesTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo_pessoa: "PJ", cpf_cnpj: "", email: "", telefone: "", endereco: "", observacoes: "" });

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("clientes").select("*").order("nome"); setItems(data || []); }

  const filtered = items.filter(i => !search || i.nome.toLowerCase().includes(search.toLowerCase()) || (i.cpf_cnpj || "").includes(search) || (i.email || "").toLowerCase().includes(search.toLowerCase()));

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const { error } = await supabase.from("clientes").insert({
      nome: form.nome, tipo_pessoa: form.tipo_pessoa, cpf_cnpj: form.cpf_cnpj || null,
      email: form.email || null, telefone: form.telefone || null,
      endereco: form.endereco || null, observacoes: form.observacoes || null,
    });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Cliente criado!");
    setOpen(false); setForm({ nome: "", tipo_pessoa: "PJ", cpf_cnpj: "", email: "", telefone: "", endereco: "", observacoes: "" }); load();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-end mb-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Cliente</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo</Label>
                    <Select value={form.tipo_pessoa} onValueChange={v => setForm({ ...form, tipo_pessoa: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                        <SelectItem value="PF">Pessoa Física</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>CPF/CNPJ</Label><Input value={form.cpf_cnpj} onChange={e => setForm({ ...form, cpf_cnpj: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></div>
                </div>
                <div><Label>Endereço</Label><Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} /></div>
                <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Documento</TableHead><TableHead>E-mail</TableHead><TableHead>Telefone</TableHead><TableHead>Ativo</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell><Badge variant="outline">{i.tipo_pessoa}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.cpf_cnpj || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.email || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.telefone || "—"}</TableCell>
                <TableCell><Badge variant="outline" className={i.ativo ? "bg-success/10 text-success" : ""}>{i.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ─── Fornecedores ─── */
function FornecedoresTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo_pessoa: "PJ", cpf_cnpj: "", email: "", telefone: "", categoria_servico: "", observacoes: "" });

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("fornecedores").select("*").order("nome"); setItems(data || []); }

  const filtered = items.filter(i => !search || i.nome.toLowerCase().includes(search.toLowerCase()) || (i.cpf_cnpj || "").includes(search) || (i.email || "").toLowerCase().includes(search.toLowerCase()));

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const { error } = await supabase.from("fornecedores").insert({
      nome: form.nome, tipo_pessoa: form.tipo_pessoa, cpf_cnpj: form.cpf_cnpj || null,
      email: form.email || null, telefone: form.telefone || null,
      categoria_servico: form.categoria_servico || null, observacoes: form.observacoes || null,
    });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Fornecedor criado!");
    setOpen(false); setForm({ nome: "", tipo_pessoa: "PJ", cpf_cnpj: "", email: "", telefone: "", categoria_servico: "", observacoes: "" }); load();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-end mb-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Fornecedor</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo</Label>
                    <Select value={form.tipo_pessoa} onValueChange={v => setForm({ ...form, tipo_pessoa: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                        <SelectItem value="PF">Pessoa Física</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>CPF/CNPJ</Label><Input value={form.cpf_cnpj} onChange={e => setForm({ ...form, cpf_cnpj: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></div>
                </div>
                <div><Label>Categoria do Serviço</Label><Input value={form.categoria_servico} onChange={e => setForm({ ...form, categoria_servico: e.target.value })} /></div>
                <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Documento</TableHead><TableHead>E-mail</TableHead><TableHead>Telefone</TableHead><TableHead>Ativo</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell><Badge variant="outline">{i.tipo_pessoa}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.cpf_cnpj || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.email || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.telefone || "—"}</TableCell>
                <TableCell><Badge variant="outline" className={i.ativo ? "bg-success/10 text-success" : ""}>{i.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum fornecedor encontrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ─── Centros de Custo ─── */
function CentrosCustoTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "" });

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("centros_custo").select("*").order("nome"); setItems(data || []); }

  const filtered = items.filter(i => !search || i.nome.toLowerCase().includes(search.toLowerCase()));

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const { error } = await supabase.from("centros_custo").insert({ nome: form.nome, descricao: form.descricao || null });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Centro de custo criado!"); setOpen(false); setForm({ nome: "", descricao: "" }); load();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("centros_custo").update({ ativo: !ativo }).eq("id", id); load();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-end mb-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Centro</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Centro de Custo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Ativo</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.descricao || "—"}</TableCell>
                <TableCell><Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum centro de custo encontrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ─── Categorias ─── */
function CategoriasTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo: "receita" });

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("categorias").select("*").order("tipo").order("nome"); setItems(data || []); }

  const filtered = items.filter(i => !search || i.nome.toLowerCase().includes(search.toLowerCase()));

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const { error } = await supabase.from("categorias").insert({ nome: form.nome, tipo: form.tipo });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Categoria criada!"); setOpen(false); setForm({ nome: "", tipo: "receita" }); load();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("categorias").update({ ativo: !ativo }).eq("id", id); load();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-end mb-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Nova</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div><Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
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
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Ativo</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{i.tipo}</Badge></TableCell>
                <TableCell><Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhuma categoria encontrada</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
