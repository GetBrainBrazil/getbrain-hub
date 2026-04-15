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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Eye, X, Copy, Check, Trash2, Landmark, ListTree, Users, Truck, Target, Tags } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { usePersistedState } from "@/hooks/use-persisted-state";

const tabConfig = {
  contas: { label: "Contas Bancárias", button: "+ Nova Conta", icon: Landmark },
  plano: { label: "Plano de Contas", button: "+ Novo Plano", icon: ListTree },
  clientes: { label: "Clientes", button: "+ Novo Cliente", icon: Users },
  fornecedores: { label: "Fornecedores", button: "+ Novo Fornecedor", icon: Truck },
  centros: { label: "Centros de Custo", button: "+ Novo Centro", icon: Target },
  categorias: { label: "Categorias", button: "+ Nova", icon: Tags },
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
              <TabsTrigger key={key} value={key} className="gap-1.5"><cfg.icon className="h-4 w-4" />{cfg.label}</TabsTrigger>
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
  // Filters
  const [filterBanco, setFilterBanco] = useState("__all__");
  const [filterTipo, setFilterTipo] = useState("__all__");
  const [filterMoeda, setFilterMoeda] = useState("__all__");

  // Unified drawer for create/view/edit
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit" | "create">("view");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nome: "", banco: "", agencia: "", conta: "", tipo: "corrente", saldo_inicial: "0,00", moeda: "BRL", ativo: true, chaves_pix: [] as string[], observacoes: "" });
  const [editNewPixKey, setEditNewPixKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("contas_bancarias").select("*").order("nome"); setItems(data || []); }

  const bancos = Array.from(new Set(items.map(i => i.banco).filter(Boolean))).sort();

  const filtered = items.filter(i => {
    if (search && !i.nome.toLowerCase().includes(search.toLowerCase()) && !(i.banco || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterBanco !== "__all__" && i.banco !== filterBanco) return false;
    if (filterTipo !== "__all__" && i.tipo !== filterTipo) return false;
    if (filterMoeda !== "__all__" && i.moeda !== filterMoeda) return false;
    return true;
  });

  function openCreate() {
    setSelectedItem(null);
    setEditForm({ nome: "", banco: "", agencia: "", conta: "", tipo: "corrente", saldo_inicial: "0,00", moeda: "BRL", ativo: true, chaves_pix: [], observacoes: "" });
    setEditNewPixKey("");
    setDrawerMode("create");
    setDrawerOpen(true);
  }

  function openDrawer(item: any) {
    setSelectedItem(item);
    setDrawerMode("view");
    setDrawerOpen(true);
  }

  function startEdit() {
    if (!selectedItem) return;
    setEditForm({
      nome: selectedItem.nome || "",
      banco: selectedItem.banco || "",
      agencia: selectedItem.agencia || "",
      conta: selectedItem.conta || "",
      tipo: selectedItem.tipo || "corrente",
      saldo_inicial: new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedItem.saldo_inicial ?? 0)),
      moeda: selectedItem.moeda || "BRL",
      ativo: selectedItem.ativo ?? true,
      chaves_pix: selectedItem.chaves_pix || [],
      observacoes: selectedItem.observacoes || "",
    });
    setEditNewPixKey("");
    setDrawerMode("edit");
  }

  function cancelEdit() {
    if (drawerMode === "create") { setDrawerOpen(false); return; }
    setDrawerMode("view");
  }

  async function handleFormSave() {
    if (!editForm.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const saldo = parseFloat(editForm.saldo_inicial.replace(/\./g, "").replace(",", "."));

    if (drawerMode === "create") {
      const { error } = await supabase.from("contas_bancarias").insert({
        nome: editForm.nome, banco: editForm.banco || null, agencia: editForm.agencia || null, conta: editForm.conta || null,
        tipo: editForm.tipo, saldo_inicial: isNaN(saldo) ? 0 : saldo, moeda: editForm.moeda,
        chaves_pix: editForm.chaves_pix.length > 0 ? editForm.chaves_pix : null,
        observacoes: editForm.observacoes || null,
      });
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Conta bancária criada!");
      setDrawerOpen(false);
    } else {
      if (isNaN(saldo)) { toast.error("Saldo inicial inválido"); return; }
      const { error } = await supabase.from("contas_bancarias").update({
        nome: editForm.nome, banco: editForm.banco || null, agencia: editForm.agencia || null, conta: editForm.conta || null,
        tipo: editForm.tipo, saldo_inicial: saldo, moeda: editForm.moeda, ativo: editForm.ativo,
        chaves_pix: editForm.chaves_pix.length > 0 ? editForm.chaves_pix : null,
        observacoes: editForm.observacoes || null,
      }).eq("id", selectedItem.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Conta atualizada com sucesso");
      const updated = { ...selectedItem, ...editForm, saldo_inicial: saldo };
      setSelectedItem(updated);
      setDrawerMode("view");
    }
    load();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("contas_bancarias").update({ ativo: !ativo }).eq("id", id); load();
  }

  async function handleDelete() {
    if (!selectedItem) return;
    const { error } = await supabase.from("contas_bancarias").delete().eq("id", selectedItem.id);
    if (error) { toast.error("Erro ao excluir conta"); return; }
    toast.success("Conta excluída com sucesso");
    setDeleteDialogOpen(false);
    setDrawerOpen(false);
    load();
  }

  function handleCopyBankData() {
    if (!selectedItem) return;
    const pixKeys = selectedItem.chaves_pix && selectedItem.chaves_pix.length > 0 ? selectedItem.chaves_pix.join(", ") : "Nenhuma";
    const text = `Banco: ${selectedItem.banco || "—"}\nAgência: ${selectedItem.agencia || "—"}\nConta: ${selectedItem.conta || "—"}\nTipo: ${formatTipo(selectedItem.tipo)}\nTitular: ${selectedItem.nome}\nPIX: ${pixKeys}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Dados bancários copiados!");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const formatMoeda = (m: string) => m === "USD" ? "Dólar (US$)" : m === "EUR" ? "Euro (€)" : "Real (R$)";
  const formatMoedaShort = (m: string) => m === "USD" ? "US$" : m === "EUR" ? "€" : "R$";
  const formatTipo = (t: string) => t === "poupanca" ? "Poupança" : t === "investimento" ? "Investimento" : "Corrente";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <Select value={filterBanco} onValueChange={setFilterBanco}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos os Bancos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os Bancos</SelectItem>
                {bancos.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todos os Tipos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os Tipos</SelectItem>
                <SelectItem value="corrente">Corrente</SelectItem>
                <SelectItem value="poupanca">Poupança</SelectItem>
                <SelectItem value="investimento">Investimento</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                <SelectItem value="ativas">Ativas</SelectItem>
                <SelectItem value="inativas">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="gap-1" onClick={openCreate}><Plus className="h-4 w-4" /> Nova Conta</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Banco</TableHead><TableHead>Tipo</TableHead><TableHead>Moeda</TableHead><TableHead>Saldo Inicial</TableHead><TableHead>Ativo</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id} className="group cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openDrawer(i)}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.banco || "—"}</TableCell>
                <TableCell className="text-sm capitalize">{i.tipo}</TableCell>
                <TableCell className="text-sm">{formatMoedaShort(i.moeda)}</TableCell>
                <TableCell className="text-sm">{formatCurrency(Number(i.saldo_inicial))}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}><Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} /></TableCell>
                <TableCell><Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma conta encontrada para os filtros selecionados</TableCell></TableRow>}
          </TableBody>
        </Table>

        <Sheet open={drawerOpen} onOpenChange={(v) => { setDrawerOpen(v); if (!v) setDrawerMode("view"); }}>
          <SheetContent className="flex flex-col w-full sm:max-w-[480px] overflow-x-hidden">
            <SheetHeader>
              <SheetTitle>{drawerMode === "view" ? "Detalhes da Conta" : drawerMode === "create" ? "Nova Conta Bancária" : "Editar Conta Bancária"}</SheetTitle>
            </SheetHeader>

            {/* View Mode */}
            {drawerMode === "view" && selectedItem && (
              <>
                <div className="flex-1 space-y-5 py-4 overflow-y-auto animate-fade-in">
                  <div><span className="text-xs text-muted-foreground">Nome</span><p className="text-sm font-medium mt-0.5">{selectedItem.nome}</p></div>
                  <div><span className="text-xs text-muted-foreground">Banco</span><p className="text-sm font-medium mt-0.5">{selectedItem.banco || "—"}</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-xs text-muted-foreground">Agência</span><p className="text-sm font-medium mt-0.5">{selectedItem.agencia || "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground">Conta</span><p className="text-sm font-medium mt-0.5">{selectedItem.conta || "—"}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-xs text-muted-foreground">Tipo</span><p className="text-sm font-medium mt-0.5">{formatTipo(selectedItem.tipo)}</p></div>
                    <div><span className="text-xs text-muted-foreground">Moeda</span><p className="text-sm font-medium mt-0.5">{formatMoeda(selectedItem.moeda)}</p></div>
                  </div>
                  <div><span className="text-xs text-muted-foreground">Saldo Inicial</span><p className="text-sm font-medium mt-0.5">{formatCurrency(Number(selectedItem.saldo_inicial ?? 0))}</p></div>
                  <div><span className="text-xs text-muted-foreground">Status</span><p className="text-sm font-medium mt-0.5">{selectedItem.ativo ? "Ativo" : "Inativo"}</p></div>
                  
                  <Button variant="outline" className="w-full gap-2" onClick={handleCopyBankData}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copiado!" : "Copiar Dados Bancários"}
                  </Button>

                  <div>
                    <span className="text-xs text-muted-foreground">Chaves PIX</span>
                    {(selectedItem.chaves_pix && selectedItem.chaves_pix.length > 0) ? (
                      <div className="space-y-1 mt-1">{selectedItem.chaves_pix.map((k: string, idx: number) => <p key={idx} className="text-sm font-medium">{k}</p>)}</div>
                    ) : <p className="text-sm text-muted-foreground mt-0.5">Nenhuma</p>}
                  </div>
                  {selectedItem.observacoes && <div><span className="text-xs text-muted-foreground">Observações</span><p className="text-sm font-medium mt-0.5 whitespace-pre-wrap">{selectedItem.observacoes}</p></div>}
                </div>
                <SheetFooter className="flex-row !justify-between gap-2 pt-4 border-t">
                  <Button variant="ghost" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDrawerOpen(false)}>Fechar</Button>
                    <Button className="gap-1.5" onClick={startEdit}><Pencil className="h-3.5 w-3.5" /> Editar Conta</Button>
                  </div>
                </SheetFooter>

                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir conta</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a conta <strong>{selectedItem.nome}</strong>? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Excluir Conta</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Edit Mode */}
            {(drawerMode === "edit" || drawerMode === "create") && (
              <>
                <div className="flex-1 space-y-4 py-4 overflow-y-auto animate-fade-in">
                  <div><Label>Nome *</Label><Input value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} placeholder="Ex: Itaú Corrente" /></div>
                  <div className="grid grid-cols-[2fr_3fr] gap-3">
                    <div><Label>Tipo</Label>
                      <Select value={editForm.tipo} onValueChange={v => setEditForm({ ...editForm, tipo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corrente">Corrente</SelectItem>
                          <SelectItem value="poupanca">Poupança</SelectItem>
                          <SelectItem value="investimento">Investimento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Moeda</Label>
                      <Select value={editForm.moeda} onValueChange={v => setEditForm({ ...editForm, moeda: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BRL">Real (R$)</SelectItem>
                          <SelectItem value="USD">Dólar (US$)</SelectItem>
                          <SelectItem value="EUR">Euro (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Banco</Label><Input value={editForm.banco} onChange={e => setEditForm({ ...editForm, banco: e.target.value })} placeholder="Itaú" /></div>
                    <div><Label>Agência</Label><Input value={editForm.agencia} onChange={e => setEditForm({ ...editForm, agencia: e.target.value })} placeholder="1234" /></div>
                    <div><Label>Conta</Label><Input value={editForm.conta} onChange={e => setEditForm({ ...editForm, conta: e.target.value })} placeholder="12345-6" /></div>
                  </div>
                  <div><Label>Saldo Inicial</Label><Input value={editForm.saldo_inicial} onChange={e => setEditForm({ ...editForm, saldo_inicial: e.target.value })} placeholder="0,00" /></div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Chaves PIX</Label>
                      <div className="flex items-center gap-2">
                        <Input value={editNewPixKey} onChange={e => setEditNewPixKey(e.target.value)} placeholder="CPF, e-mail, telefone..." className="h-8 text-sm w-48" onKeyDown={e => { if (e.key === "Enter" && editNewPixKey.trim()) { setEditForm({ ...editForm, chaves_pix: [...editForm.chaves_pix, editNewPixKey.trim()] }); setEditNewPixKey(""); }}} />
                        <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => { if (editNewPixKey.trim()) { setEditForm({ ...editForm, chaves_pix: [...editForm.chaves_pix, editNewPixKey.trim()] }); setEditNewPixKey(""); }}}><Plus className="h-3 w-3" /> Adicionar</Button>
                      </div>
                    </div>
                    {editForm.chaves_pix.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">Nenhuma chave PIX cadastrada</p>
                    ) : (
                      <div className="space-y-1.5">
                        {editForm.chaves_pix.map((k, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-1.5 text-sm">
                            <span>{k}</span>
                            <button type="button" onClick={() => setEditForm({ ...editForm, chaves_pix: editForm.chaves_pix.filter((_, j) => j !== idx) })} className="text-muted-foreground hover:text-destructive transition-colors"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div><Label>Observações</Label><Textarea value={editForm.observacoes} onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })} placeholder="Observações sobre a conta..." rows={4} /></div>
                  {drawerMode === "edit" && (
                    <div className="flex items-center gap-3">
                      <Label>Ativo</Label>
                      <Switch checked={editForm.ativo} onCheckedChange={v => setEditForm({ ...editForm, ativo: v })} />
                    </div>
                  )}
                </div>
                <SheetFooter className="flex-row gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1" onClick={cancelEdit}>Cancelar</Button>
                  <Button className="flex-1" onClick={handleFormSave}>{drawerMode === "create" ? "Salvar" : "Salvar Alterações"}</Button>
                </SheetFooter>
              </>
            )}
          </SheetContent>
        </Sheet>
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
