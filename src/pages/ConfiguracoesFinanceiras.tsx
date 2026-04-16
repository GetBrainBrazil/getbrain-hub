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
import { Plus, Search, Pencil, Eye, X, Copy, Check, Trash2, Landmark, Users, Truck, Target, Tags, UserRound } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { usePersistedState } from "@/hooks/use-persisted-state";

const tabConfig = {
  contas: { label: "Contas Bancárias", button: "+ Nova Conta", icon: Landmark },
  colaboradores: { label: "Colaboradores", button: "+ Novo Colaborador", icon: UserRound },
  clientes: { label: "Clientes", button: "+ Novo Cliente", icon: Users },
  fornecedores: { label: "Fornecedores", button: "+ Novo Fornecedor", icon: Truck },
  centros: { label: "Centros de Custo", button: "+ Novo Centro", icon: Target },
  categorias: { label: "Categorias", button: "+ Nova", icon: Tags },
};

type TabKey = keyof typeof tabConfig;

export default function ConfiguracoesFinanceiras() {
  const [activeTab, setActiveTab] = usePersistedState<TabKey>("fin_config_tab", "contas");
  // Migrate legacy "plano" value to "colaboradores"
  useEffect(() => { if ((activeTab as string) === "plano") setActiveTab("colaboradores"); }, []);
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
        <TabsContent value="colaboradores"><ColaboradoresTab search={search} /></TabsContent>
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
            <Select value={filterMoeda} onValueChange={setFilterMoeda}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todas as Moedas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as Moedas</SelectItem>
                <SelectItem value="BRL">Real (R$)</SelectItem>
                <SelectItem value="USD">Dólar (US$)</SelectItem>
                <SelectItem value="EUR">Euro (€)</SelectItem>
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

/* ─── Colaboradores ─── */
const ESTADOS_BR_COL = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function ColaboradoresTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [filterCargo, setFilterCargo] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit" | "create">("view");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    nome: "", cargo: "", cpf: "",
    emails: [] as string[], telefones: [] as string[],
    banco: "", agencia: "", conta: "", tipo_conta: "corrente", chaves_pix: [] as string[],
    cep: "", estado: "", cidade: "", endereco: "", numero: "", bairro: "", complemento: "",
    data_admissao: "", salario_base: "0,00",
    observacoes: "", ativo: true,
  });
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPix, setNewPix] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => { load(); supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null)); }, []);
  async function load() { const { data } = await supabase.from("colaboradores" as any).select("*").order("nome"); setItems(data || []); }

  const cargos = Array.from(new Set(items.map(i => i.cargo).filter(Boolean))).sort();

  const filtered = items.filter(i => {
    if (search) {
      const s = search.toLowerCase();
      const firstEmail = i.emails?.[0] || "";
      if (!i.nome.toLowerCase().includes(s) && !(i.cpf || "").includes(s) && !firstEmail.toLowerCase().includes(s) && !(i.cargo || "").toLowerCase().includes(s)) return false;
    }
    if (filterCargo !== "__all__" && i.cargo !== filterCargo) return false;
    if (filterStatus === "ativo" && !i.ativo) return false;
    if (filterStatus === "inativo" && i.ativo) return false;
    return true;
  });

  function formatCpf(value: string | null) {
    if (!value) return "—";
    const d = value.replace(/\D/g, "");
    if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    return value;
  }
  function formatPhone(value: string | null) {
    if (!value) return "—";
    const d = value.replace(/\D/g, "");
    if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    return value;
  }
  function applyCpfMask(value: string) {
    const d = value.replace(/\D/g, "").slice(0, 11);
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  function applyPhoneMask(value: string) {
    const d = value.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.replace(/(\d{1,2})/, "($1");
    if (d.length <= 7) return d.replace(/(\d{2})(\d{1,5})/, "($1) $2");
    return d.replace(/(\d{2})(\d{5})(\d{1,4})/, "($1) $2-$3");
  }
  function applyCepMask(value: string) {
    const d = value.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 5) return d;
    return d.replace(/(\d{5})(\d{1,3})/, "$1-$2");
  }
  function applySalaryMask(value: string) {
    const d = value.replace(/\D/g, "");
    if (!d) return "0,00";
    const num = parseInt(d, 10) / 100;
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  }
  function buildAddressString(item: any) {
    const parts: string[] = [];
    if (item.endereco) {
      let line = item.endereco;
      if (item.numero) line += `, ${item.numero}`;
      if (item.complemento) line += `, ${item.complemento}`;
      parts.push(line);
    }
    if (item.bairro) parts.push(item.bairro);
    const cityState = [item.cidade, item.estado].filter(Boolean).join("/");
    if (cityState) parts.push(cityState);
    if (item.cep) parts.push(item.cep);
    return parts.join(" - ");
  }
  function formatTipoConta(t: string) { return t === "poupanca" ? "Poupança" : "Corrente"; }
  function formatDate(d: string | null) {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }

  function openCreate() {
    setSelectedItem(null);
    setEditForm({ nome: "", cargo: "", cpf: "", emails: [], telefones: [], banco: "", agencia: "", conta: "", tipo_conta: "corrente", chaves_pix: [], cep: "", estado: "", cidade: "", endereco: "", numero: "", bairro: "", complemento: "", data_admissao: "", salario_base: "0,00", observacoes: "", ativo: true });
    setNewEmail(""); setNewPhone(""); setNewPix("");
    setDrawerMode("create");
    setDrawerOpen(true);
  }
  function openDrawer(item: any) { setSelectedItem(item); setDrawerMode("view"); setDrawerOpen(true); }
  function startEdit() {
    if (!selectedItem) return;
    setEditForm({
      nome: selectedItem.nome || "",
      cargo: selectedItem.cargo || "",
      cpf: selectedItem.cpf || "",
      emails: selectedItem.emails || [],
      telefones: selectedItem.telefones || [],
      banco: selectedItem.banco || "",
      agencia: selectedItem.agencia || "",
      conta: selectedItem.conta || "",
      tipo_conta: selectedItem.tipo_conta || "corrente",
      chaves_pix: selectedItem.chaves_pix || [],
      cep: selectedItem.cep || "",
      estado: selectedItem.estado || "",
      cidade: selectedItem.cidade || "",
      endereco: selectedItem.endereco || "",
      numero: selectedItem.numero || "",
      bairro: selectedItem.bairro || "",
      complemento: selectedItem.complemento || "",
      data_admissao: selectedItem.data_admissao || "",
      salario_base: new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(selectedItem.salario_base ?? 0)),
      observacoes: selectedItem.observacoes || "",
      ativo: selectedItem.ativo ?? true,
    });
    setNewEmail(""); setNewPhone(""); setNewPix("");
    setDrawerMode("edit");
  }
  function cancelEdit() { if (drawerMode === "create") { setDrawerOpen(false); return; } setDrawerMode("view"); }

  function addEmail() {
    const email = newEmail.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("E-mail inválido"); return; }
    if (editForm.emails.includes(email)) { toast.error("E-mail já cadastrado"); return; }
    setEditForm({ ...editForm, emails: [...editForm.emails, email] });
    setNewEmail("");
  }
  function removeEmail(idx: number) { setEditForm({ ...editForm, emails: editForm.emails.filter((_, i) => i !== idx) }); }
  function addPhone() {
    const phone = newPhone.trim();
    if (!phone) return;
    if (editForm.telefones.includes(phone)) { toast.error("Telefone já cadastrado"); return; }
    setEditForm({ ...editForm, telefones: [...editForm.telefones, phone] });
    setNewPhone("");
  }
  function removePhone(idx: number) { setEditForm({ ...editForm, telefones: editForm.telefones.filter((_, i) => i !== idx) }); }
  function addPix() {
    const pix = newPix.trim();
    if (!pix) return;
    if (editForm.chaves_pix.includes(pix)) { toast.error("Chave PIX já cadastrada"); return; }
    setEditForm({ ...editForm, chaves_pix: [...editForm.chaves_pix, pix] });
    setNewPix("");
  }
  function removePix(idx: number) { setEditForm({ ...editForm, chaves_pix: editForm.chaves_pix.filter((_, i) => i !== idx) }); }

  async function handleFormSave() {
    if (!editForm.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const salario = parseFloat(editForm.salario_base.replace(/\./g, "").replace(",", "."));

    const payload: any = {
      nome: editForm.nome,
      cargo: editForm.cargo || null,
      cpf: editForm.cpf || null,
      emails: editForm.emails,
      telefones: editForm.telefones,
      banco: editForm.banco || null,
      agencia: editForm.agencia || null,
      conta: editForm.conta || null,
      tipo_conta: editForm.tipo_conta,
      chaves_pix: editForm.chaves_pix,
      cep: editForm.cep || null, estado: editForm.estado || null, cidade: editForm.cidade || null,
      endereco: editForm.endereco || null, numero: editForm.numero || null, bairro: editForm.bairro || null,
      complemento: editForm.complemento || null,
      data_admissao: editForm.data_admissao || null,
      salario_base: isNaN(salario) ? 0 : salario,
      observacoes: editForm.observacoes || null,
    };

    if (drawerMode === "create") {
      const { data: userData } = await supabase.auth.getUser();
      payload.created_by = userData.user?.id || null;
      const { error } = await supabase.from("colaboradores" as any).insert(payload);
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Colaborador cadastrado com sucesso");
      setDrawerOpen(false);
    } else {
      payload.ativo = editForm.ativo;
      const { error } = await supabase.from("colaboradores" as any).update(payload).eq("id", selectedItem.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Colaborador atualizado com sucesso");
      setSelectedItem({ ...selectedItem, ...payload });
      setDrawerMode("view");
    }
    load();
  }

  async function handleDelete() {
    if (!selectedItem) return;
    const { error } = await supabase.from("colaboradores" as any).delete().eq("id", selectedItem.id);
    if (error) { toast.error("Erro ao excluir colaborador"); return; }
    toast.success("Colaborador excluído com sucesso");
    setDeleteDialogOpen(false);
    setDrawerOpen(false);
    load();
  }

  function handleCopyBankData() {
    if (!selectedItem) return;
    const pix = selectedItem.chaves_pix?.length ? selectedItem.chaves_pix.join(", ") : "—";
    const text = `Nome: ${selectedItem.nome}\nBanco: ${selectedItem.banco || "—"}\nAgência: ${selectedItem.agencia || "—"}\nConta: ${selectedItem.conta || "—"}\nTipo: ${formatTipoConta(selectedItem.tipo_conta)}\nPIX: ${pix}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Dados bancários copiados!");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("colaboradores" as any).update({ ativo: !ativo }).eq("id", id); load();
  }

  const canSeeSalary = selectedItem && currentUserId && selectedItem.created_by === currentUserId;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <Select value={filterCargo} onValueChange={setFilterCargo}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos os Cargos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os Cargos</SelectItem>
                {cargos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Todos os Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os Status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="gap-1" onClick={openCreate}><Plus className="h-4 w-4" /> Novo Colaborador</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome Completo</TableHead><TableHead>Cargo</TableHead><TableHead>Documento</TableHead><TableHead>E-mail</TableHead><TableHead>Telefone</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id} className="group cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openDrawer(i)}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.cargo || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatCpf(i.cpf)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.emails?.[0] || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.telefones?.length ? formatPhone(i.telefones[0]) : "—"}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={i.ativo ? "border-success/40 text-success bg-success/10" : "border-muted-foreground/30 text-muted-foreground bg-muted/40"}>
                      {i.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    <Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} />
                  </div>
                </TableCell>
                <TableCell><Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum colaborador encontrado para os filtros selecionados</TableCell></TableRow>}
          </TableBody>
        </Table>

        <Sheet open={drawerOpen} onOpenChange={(v) => { setDrawerOpen(v); if (!v) setDrawerMode("view"); }}>
          <SheetContent className="flex flex-col w-full sm:max-w-[520px] overflow-x-hidden">
            <SheetHeader>
              <SheetTitle>{drawerMode === "view" ? "Detalhes do Colaborador" : drawerMode === "create" ? "Novo Colaborador" : "Editar Colaborador"}</SheetTitle>
            </SheetHeader>

            {/* View Mode */}
            {drawerMode === "view" && selectedItem && (
              <>
                <div className="flex-1 space-y-5 py-4 overflow-y-auto animate-fade-in">
                  <div><span className="text-xs text-muted-foreground">Nome Completo</span><p className="text-sm font-medium mt-0.5">{selectedItem.nome}</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-xs text-muted-foreground">Cargo</span><p className="text-sm font-medium mt-0.5">{selectedItem.cargo || "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground">CPF</span><p className="text-sm font-medium mt-0.5">{formatCpf(selectedItem.cpf)}</p></div>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground">E-mails</span>
                    {(selectedItem.emails?.length > 0) ? (
                      <div className="space-y-0.5 mt-0.5">{selectedItem.emails.map((e: string, idx: number) => <p key={idx} className="text-sm font-medium">{e}</p>)}</div>
                    ) : <p className="text-sm text-muted-foreground mt-0.5">Nenhum e-mail cadastrado</p>}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Telefones</span>
                    {(selectedItem.telefones?.length > 0) ? (
                      <div className="space-y-0.5 mt-0.5">{selectedItem.telefones.map((t: string, idx: number) => <p key={idx} className="text-sm font-medium">{formatPhone(t)}</p>)}</div>
                    ) : <p className="text-sm text-muted-foreground mt-0.5">Nenhum telefone cadastrado</p>}
                  </div>

                  {/* Dados Bancários */}
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Dados Bancários do Colaborador</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="text-xs text-muted-foreground">Banco</span><p className="text-sm font-medium mt-0.5">{selectedItem.banco || "—"}</p></div>
                      <div><span className="text-xs text-muted-foreground">Tipo da Conta</span><p className="text-sm font-medium mt-0.5">{formatTipoConta(selectedItem.tipo_conta)}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="text-xs text-muted-foreground">Agência</span><p className="text-sm font-medium mt-0.5">{selectedItem.agencia || "—"}</p></div>
                      <div><span className="text-xs text-muted-foreground">Conta</span><p className="text-sm font-medium mt-0.5">{selectedItem.conta || "—"}</p></div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Chaves PIX</span>
                      {(selectedItem.chaves_pix?.length > 0) ? (
                        <div className="space-y-0.5 mt-0.5">{selectedItem.chaves_pix.map((k: string, idx: number) => <p key={idx} className="text-sm font-medium">{k}</p>)}</div>
                      ) : <p className="text-sm text-muted-foreground mt-0.5">Nenhuma chave PIX cadastrada</p>}
                    </div>
                    <Button variant="outline" className="w-full gap-2" onClick={handleCopyBankData}>
                      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copiado!" : "Copiar Dados Bancários"}
                    </Button>
                  </div>

                  {/* Endereço */}
                  <div className="pt-2 border-t">
                    <span className="text-xs text-muted-foreground font-semibold">Endereço</span>
                    <p className="text-sm font-medium mt-0.5">{buildAddressString(selectedItem) || "Nenhum endereço cadastrado"}</p>
                  </div>

                  {/* Informações contratuais */}
                  <div className="pt-2 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="text-xs text-muted-foreground">Data de Admissão</span><p className="text-sm font-medium mt-0.5">{formatDate(selectedItem.data_admissao)}</p></div>
                      {canSeeSalary && (
                        <div><span className="text-xs text-muted-foreground">Salário Base</span><p className="text-sm font-medium mt-0.5">{formatCurrency(Number(selectedItem.salario_base ?? 0))}</p></div>
                      )}
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Observações</span>
                      <p className="text-sm font-medium mt-0.5 whitespace-pre-wrap">{selectedItem.observacoes || "Sem observações"}</p>
                    </div>
                    <div><span className="text-xs text-muted-foreground">Status</span><p className="text-sm font-medium mt-0.5">{selectedItem.ativo ? "Ativo" : "Inativo"}</p></div>
                  </div>
                </div>
                <SheetFooter className="flex-row !justify-between gap-2 pt-4 border-t">
                  <Button variant="ghost" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDrawerOpen(false)}>Fechar</Button>
                    <Button className="gap-1.5" onClick={startEdit}><Pencil className="h-3.5 w-3.5" /> Editar Colaborador</Button>
                  </div>
                </SheetFooter>

                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir colaborador</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o colaborador <strong>{selectedItem.nome}</strong>? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Excluir Colaborador</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Edit/Create Mode */}
            {(drawerMode === "edit" || drawerMode === "create") && (
              <>
                <div className="flex-1 space-y-4 py-4 overflow-y-auto animate-fade-in">
                  <div><Label>Nome Completo *</Label><Input value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} placeholder="Nome completo" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Cargo</Label><Input value={editForm.cargo} onChange={e => setEditForm({ ...editForm, cargo: e.target.value })} placeholder="Ex: Desenvolvedor" /></div>
                    <div><Label>CPF</Label><Input value={editForm.cpf} onChange={e => setEditForm({ ...editForm, cpf: applyCpfMask(e.target.value) })} placeholder="000.000.000-00" /></div>
                  </div>

                  {/* E-mails */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>E-mails</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addEmail}><Plus className="h-3 w-3" /> Adicionar</Button>
                    </div>
                    <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addEmail())} />
                    {editForm.emails.length > 0 ? (
                      <div className="space-y-1 mt-2">{editForm.emails.map((em, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2.5 py-1.5 text-sm">
                          <span>{em}</span>
                          <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeEmail(idx)}><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}</div>
                    ) : <p className="text-xs text-muted-foreground mt-1.5">Nenhum e-mail cadastrado</p>}
                  </div>

                  {/* Telefones */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>Telefones</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addPhone}><Plus className="h-3 w-3" /> Adicionar</Button>
                    </div>
                    <Input value={newPhone} onChange={e => setNewPhone(applyPhoneMask(e.target.value))} placeholder="(00) 00000-0000" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPhone())} />
                    {editForm.telefones.length > 0 ? (
                      <div className="space-y-1 mt-2">{editForm.telefones.map((ph, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2.5 py-1.5 text-sm">
                          <span>{formatPhone(ph)}</span>
                          <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removePhone(idx)}><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}</div>
                    ) : <p className="text-xs text-muted-foreground mt-1.5">Nenhum telefone cadastrado</p>}
                  </div>

                  {/* Dados Bancários */}
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-semibold text-sm">Dados Bancários</Label>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="text-xs">Banco</Label><Input value={editForm.banco} onChange={e => setEditForm({ ...editForm, banco: e.target.value })} placeholder="Ex: Itaú" /></div>
                      <div><Label className="text-xs">Agência</Label><Input value={editForm.agencia} onChange={e => setEditForm({ ...editForm, agencia: e.target.value })} placeholder="1234" /></div>
                      <div><Label className="text-xs">Conta</Label><Input value={editForm.conta} onChange={e => setEditForm({ ...editForm, conta: e.target.value })} placeholder="12345-6" /></div>
                    </div>
                    <div className="w-1/2">
                      <Label className="text-xs">Tipo da Conta</Label>
                      <Select value={editForm.tipo_conta} onValueChange={v => setEditForm({ ...editForm, tipo_conta: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corrente">Corrente</SelectItem>
                          <SelectItem value="poupanca">Poupança</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label>Chaves PIX</Label>
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addPix}><Plus className="h-3 w-3" /> Adicionar</Button>
                      </div>
                      <Input value={newPix} onChange={e => setNewPix(e.target.value)} placeholder="CPF, e-mail, telefone, chave aleatória..." onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPix())} />
                      {editForm.chaves_pix.length > 0 ? (
                        <div className="space-y-1 mt-2">{editForm.chaves_pix.map((k, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2.5 py-1.5 text-sm">
                            <span>{k}</span>
                            <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removePix(idx)}><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}</div>
                      ) : <p className="text-xs text-muted-foreground mt-1.5">Nenhuma chave PIX cadastrada</p>}
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="font-semibold text-sm">Endereço</Label>
                    <div className="grid grid-cols-[2fr_1fr_2fr] gap-3">
                      <div><Label className="text-xs">CEP</Label><Input value={editForm.cep} onChange={e => setEditForm({ ...editForm, cep: applyCepMask(e.target.value) })} placeholder="00000-000" /></div>
                      <div><Label className="text-xs">Estado</Label>
                        <Select value={editForm.estado || "__none__"} onValueChange={v => setEditForm({ ...editForm, estado: v === "__none__" ? "" : v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{[<SelectItem key="__none__" value="__none__">Selecione</SelectItem>, ...ESTADOS_BR_COL.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)]}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Cidade</Label><Input value={editForm.cidade} onChange={e => setEditForm({ ...editForm, cidade: e.target.value })} placeholder="Cidade" /></div>
                    </div>
                    <div className="grid grid-cols-[3fr_1fr_2fr] gap-3">
                      <div><Label className="text-xs">Endereço</Label><Input value={editForm.endereco} onChange={e => setEditForm({ ...editForm, endereco: e.target.value })} placeholder="Rua, Avenida, etc." /></div>
                      <div><Label className="text-xs">Número</Label><Input value={editForm.numero} onChange={e => setEditForm({ ...editForm, numero: e.target.value })} placeholder="Nº" /></div>
                      <div><Label className="text-xs">Bairro</Label><Input value={editForm.bairro} onChange={e => setEditForm({ ...editForm, bairro: e.target.value })} placeholder="Bairro" /></div>
                    </div>
                    <div><Label className="text-xs">Complemento</Label><Input value={editForm.complemento} onChange={e => setEditForm({ ...editForm, complemento: e.target.value })} placeholder="Apto, Sala, Bloco, etc." /></div>
                  </div>

                  {/* Informações contratuais */}
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="font-semibold text-sm">Informações Contratuais</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Data de Admissão</Label><Input type="date" value={editForm.data_admissao} onChange={e => setEditForm({ ...editForm, data_admissao: e.target.value })} /></div>
                      <div><Label className="text-xs">Salário Base (R$)</Label><Input value={editForm.salario_base} onChange={e => setEditForm({ ...editForm, salario_base: applySalaryMask(e.target.value) })} placeholder="0,00" /></div>
                    </div>
                    <div><Label>Observações</Label><Textarea rows={4} value={editForm.observacoes} onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })} placeholder="Observações gerais sobre o colaborador" /></div>
                    {drawerMode === "edit" && (
                      <div className="flex items-center gap-2">
                        <Switch checked={editForm.ativo} onCheckedChange={v => setEditForm({ ...editForm, ativo: v })} />
                        <Label>{editForm.ativo ? "Ativo" : "Inativo"}</Label>
                      </div>
                    )}
                  </div>
                </div>
                <SheetFooter className="flex-row justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={cancelEdit}>Cancelar</Button>
                  <Button onClick={handleFormSave}>{drawerMode === "create" ? "Salvar" : "Salvar Alterações"}</Button>
                </SheetFooter>
              </>
            )}
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}

/* ─── Clientes ─── */
const ESTADOS_BR = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function ClientesTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [filterTipo, setFilterTipo] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit" | "create">("view");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    nome: "", tipo_pessoa: "PJ", cpf_cnpj: "", razao_social: "", nome_empresa: "",
    emails: [] as string[], telefones: [] as string[],
    cep: "", estado: "", cidade: "", endereco: "", numero: "", bairro: "", complemento: "",
    observacoes: "", ativo: true,
  });
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("clientes").select("*").order("nome"); setItems(data || []); }

  const filtered = items.filter(i => {
    if (search) {
      const s = search.toLowerCase();
      if (!i.nome.toLowerCase().includes(s) && !(i.cpf_cnpj || "").includes(s) && !(i.email || "").toLowerCase().includes(s)) return false;
    }
    if (filterTipo !== "__all__" && i.tipo_pessoa !== filterTipo) return false;
    if (filterStatus === "ativo" && !i.ativo) return false;
    if (filterStatus === "inativo" && i.ativo) return false;
    return true;
  });

  function formatCpfCnpj(value: string | null, tipo: string) {
    if (!value) return "—";
    const d = value.replace(/\D/g, "");
    if (tipo === "PF" && d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    if (tipo === "PJ" && d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    return value;
  }

  function formatPhone(value: string | null) {
    if (!value) return "—";
    const d = value.replace(/\D/g, "");
    if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    return value;
  }

  function applyCpfCnpjMask(value: string, tipo: string) {
    const d = value.replace(/\D/g, "");
    if (tipo === "PF") return d.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return d.slice(0, 14).replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }

  function applyPhoneMask(value: string) {
    const d = value.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.replace(/(\d{1,2})/, "($1");
    if (d.length <= 7) return d.replace(/(\d{2})(\d{1,5})/, "($1) $2");
    return d.replace(/(\d{2})(\d{5})(\d{1,4})/, "($1) $2-$3");
  }

  function applyCepMask(value: string) {
    const d = value.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 5) return d;
    return d.replace(/(\d{5})(\d{1,3})/, "$1-$2");
  }

  function openCreate() {
    setSelectedItem(null);
    setEditForm({ nome: "", tipo_pessoa: "PJ", cpf_cnpj: "", razao_social: "", nome_empresa: "", emails: [], telefones: [], cep: "", estado: "", cidade: "", endereco: "", numero: "", bairro: "", complemento: "", observacoes: "", ativo: true });
    setNewEmail(""); setNewPhone("");
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
      tipo_pessoa: selectedItem.tipo_pessoa || "PJ",
      cpf_cnpj: selectedItem.cpf_cnpj || "",
      razao_social: selectedItem.razao_social || "",
      nome_empresa: selectedItem.nome_empresa || "",
      emails: selectedItem.emails?.length ? selectedItem.emails : (selectedItem.email ? [selectedItem.email] : []),
      telefones: selectedItem.telefones?.length ? selectedItem.telefones : (selectedItem.telefone ? [selectedItem.telefone] : []),
      cep: selectedItem.cep || "",
      estado: selectedItem.estado || "",
      cidade: selectedItem.cidade || "",
      endereco: selectedItem.endereco || "",
      numero: selectedItem.numero || "",
      bairro: selectedItem.bairro || "",
      complemento: selectedItem.complemento || "",
      observacoes: selectedItem.observacoes || "",
      ativo: selectedItem.ativo ?? true,
    });
    setNewEmail(""); setNewPhone("");
    setDrawerMode("edit");
  }

  function cancelEdit() {
    if (drawerMode === "create") { setDrawerOpen(false); return; }
    setDrawerMode("view");
  }

  function addEmail() {
    const email = newEmail.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("E-mail inválido"); return; }
    if (editForm.emails.includes(email)) { toast.error("E-mail já cadastrado"); return; }
    setEditForm({ ...editForm, emails: [...editForm.emails, email] });
    setNewEmail("");
  }

  function removeEmail(idx: number) {
    setEditForm({ ...editForm, emails: editForm.emails.filter((_, i) => i !== idx) });
  }

  function addPhone() {
    const phone = newPhone.trim();
    if (!phone) return;
    if (editForm.telefones.includes(phone)) { toast.error("Telefone já cadastrado"); return; }
    setEditForm({ ...editForm, telefones: [...editForm.telefones, phone] });
    setNewPhone("");
  }

  function removePhone(idx: number) {
    setEditForm({ ...editForm, telefones: editForm.telefones.filter((_, i) => i !== idx) });
  }

  async function handleFormSave() {
    if (!editForm.nome.trim()) { toast.error("Nome é obrigatório"); return; }

    const payload: any = {
      nome: editForm.nome, tipo_pessoa: editForm.tipo_pessoa, cpf_cnpj: editForm.cpf_cnpj || null,
      razao_social: editForm.tipo_pessoa === "PJ" ? (editForm.razao_social || null) : null,
      nome_empresa: editForm.tipo_pessoa === "PJ" ? (editForm.nome_empresa || null) : null,
      emails: editForm.emails.length > 0 ? editForm.emails : [],
      telefones: editForm.telefones.length > 0 ? editForm.telefones : [],
      email: editForm.emails[0] || null,
      telefone: editForm.telefones[0] || null,
      cep: editForm.cep || null, estado: editForm.estado || null, cidade: editForm.cidade || null,
      endereco: editForm.endereco || null, numero: editForm.numero || null, bairro: editForm.bairro || null,
      complemento: editForm.complemento || null, observacoes: editForm.observacoes || null,
    };

    if (drawerMode === "create") {
      const { error } = await supabase.from("clientes").insert(payload);
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Cliente criado!");
      setDrawerOpen(false);
    } else {
      payload.ativo = editForm.ativo;
      const { error } = await supabase.from("clientes").update(payload).eq("id", selectedItem.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Cliente atualizado com sucesso");
      const updated = { ...selectedItem, ...payload };
      setSelectedItem(updated);
      setDrawerMode("view");
    }
    load();
  }

  async function handleDelete() {
    if (!selectedItem) return;
    const { error } = await supabase.from("clientes").delete().eq("id", selectedItem.id);
    if (error) { toast.error("Erro ao excluir cliente"); return; }
    toast.success("Cliente excluído com sucesso");
    setDeleteDialogOpen(false);
    setDrawerOpen(false);
    load();
  }

  function handleCopyData() {
    if (!selectedItem) return;
    const docLabel = selectedItem.tipo_pessoa === "PF" ? "CPF" : "CNPJ";
    const emails = selectedItem.emails?.length ? selectedItem.emails.join(", ") : (selectedItem.email || "—");
    const phones = selectedItem.telefones?.length ? selectedItem.telefones.map((t: string) => formatPhone(t)).join(", ") : formatPhone(selectedItem.telefone);
    let text = `Nome: ${selectedItem.nome}`;
    if (selectedItem.tipo_pessoa === "PJ" && selectedItem.nome_empresa) text += `\nEmpresa: ${selectedItem.nome_empresa}`;
    text += `\n${docLabel}: ${formatCpfCnpj(selectedItem.cpf_cnpj, selectedItem.tipo_pessoa)}`;
    text += `\nE-mails: ${emails}`;
    text += `\nTelefones: ${phones}`;
    const addr = buildAddressString(selectedItem);
    if (addr) text += `\nEndereço: ${addr}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Dados do cliente copiados!");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function buildAddressString(item: any) {
    const parts: string[] = [];
    if (item.endereco) {
      let line = item.endereco;
      if (item.numero) line += `, ${item.numero}`;
      if (item.complemento) line += `, ${item.complemento}`;
      parts.push(line);
    }
    if (item.bairro) parts.push(item.bairro);
    const cityState = [item.cidade, item.estado].filter(Boolean).join("/");
    if (cityState) parts.push(cityState);
    if (item.cep) parts.push(item.cep);
    return parts.join(" - ");
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("clientes").update({ ativo: !ativo }).eq("id", id); load();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todos os Tipos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os Tipos</SelectItem>
                <SelectItem value="PF">Pessoa Física</SelectItem>
                <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Todos os Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os Status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="gap-1" onClick={openCreate}><Plus className="h-4 w-4" /> Novo Cliente</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Documento</TableHead><TableHead>E-mail</TableHead><TableHead>Telefone</TableHead><TableHead>Ativo</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id} className="group cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openDrawer(i)}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell><Badge variant="outline">{i.tipo_pessoa}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatCpfCnpj(i.cpf_cnpj, i.tipo_pessoa)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.emails?.length ? i.emails[0] : (i.email || "—")}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.telefones?.length ? formatPhone(i.telefones[0]) : formatPhone(i.telefone)}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}><Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} /></TableCell>
                <TableCell><Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado para os filtros selecionados</TableCell></TableRow>}
          </TableBody>
        </Table>

        <Sheet open={drawerOpen} onOpenChange={(v) => { setDrawerOpen(v); if (!v) setDrawerMode("view"); }}>
          <SheetContent className="flex flex-col w-full sm:max-w-[520px] overflow-x-hidden">
            <SheetHeader>
              <SheetTitle>{drawerMode === "view" ? "Detalhes do Cliente" : drawerMode === "create" ? "Novo Cliente" : "Editar Cliente"}</SheetTitle>
            </SheetHeader>

            {/* View Mode */}
            {drawerMode === "view" && selectedItem && (
              <>
                <div className="flex-1 space-y-5 py-4 overflow-y-auto animate-fade-in">
                  <div><span className="text-xs text-muted-foreground">Nome</span><p className="text-sm font-medium mt-0.5">{selectedItem.nome}</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-xs text-muted-foreground">Tipo</span><div className="mt-0.5"><Badge variant="outline">{selectedItem.tipo_pessoa === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</Badge></div></div>
                    <div><span className="text-xs text-muted-foreground">Documento</span><p className="text-sm font-medium mt-0.5">{formatCpfCnpj(selectedItem.cpf_cnpj, selectedItem.tipo_pessoa)}</p></div>
                  </div>
                  {selectedItem.tipo_pessoa === "PJ" && selectedItem.razao_social && (
                    <div><span className="text-xs text-muted-foreground">Razão Social</span><p className="text-sm font-medium mt-0.5">{selectedItem.razao_social}</p></div>
                  )}
                  {selectedItem.tipo_pessoa === "PJ" && selectedItem.nome_empresa && (
                    <div><span className="text-xs text-muted-foreground">Nome da Empresa</span><p className="text-sm font-medium mt-0.5">{selectedItem.nome_empresa}</p></div>
                  )}
                  <div><span className="text-xs text-muted-foreground">Status</span><p className="text-sm font-medium mt-0.5">{selectedItem.ativo ? "Ativo" : "Inativo"}</p></div>

                  <div>
                    <span className="text-xs text-muted-foreground">E-mails</span>
                    {(selectedItem.emails?.length > 0) ? (
                      <div className="space-y-0.5 mt-0.5">{selectedItem.emails.map((e: string, idx: number) => <p key={idx} className="text-sm font-medium">{e}</p>)}</div>
                    ) : selectedItem.email ? <p className="text-sm font-medium mt-0.5">{selectedItem.email}</p> : <p className="text-sm text-muted-foreground mt-0.5">Nenhum e-mail cadastrado</p>}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Telefones</span>
                    {(selectedItem.telefones?.length > 0) ? (
                      <div className="space-y-0.5 mt-0.5">{selectedItem.telefones.map((t: string, idx: number) => <p key={idx} className="text-sm font-medium">{formatPhone(t)}</p>)}</div>
                    ) : selectedItem.telefone ? <p className="text-sm font-medium mt-0.5">{formatPhone(selectedItem.telefone)}</p> : <p className="text-sm text-muted-foreground mt-0.5">Nenhum telefone cadastrado</p>}
                  </div>

                  {(selectedItem.endereco || selectedItem.cep || selectedItem.cidade || selectedItem.estado) && (
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold">Endereço</span>
                      <p className="text-sm font-medium mt-0.5">{buildAddressString(selectedItem) || "—"}</p>
                    </div>
                  )}

                  {selectedItem.observacoes && <div><span className="text-xs text-muted-foreground">Observações</span><p className="text-sm font-medium mt-0.5 whitespace-pre-wrap">{selectedItem.observacoes}</p></div>}

                  <Button variant="outline" className="w-full gap-2" onClick={handleCopyData}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copiado!" : "Copiar Dados"}
                  </Button>
                </div>
                <SheetFooter className="flex-row !justify-between gap-2 pt-4 border-t">
                  <Button variant="ghost" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDrawerOpen(false)}>Fechar</Button>
                    <Button className="gap-1.5" onClick={startEdit}><Pencil className="h-3.5 w-3.5" /> Editar Cliente</Button>
                  </div>
                </SheetFooter>

                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o cliente <strong>{selectedItem.nome}</strong>? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Excluir Cliente</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Edit/Create Mode */}
            {(drawerMode === "edit" || drawerMode === "create") && (
              <>
                <div className="flex-1 space-y-4 py-4 overflow-y-auto animate-fade-in">
                  {/* Tipo + Documento */}
                  <div className="grid grid-cols-[2fr_3fr] gap-3">
                    <div><Label>Tipo</Label>
                      <Select value={editForm.tipo_pessoa} onValueChange={v => setEditForm({ ...editForm, tipo_pessoa: v, cpf_cnpj: "" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                          <SelectItem value="PF">Pessoa Física</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>{editForm.tipo_pessoa === "PF" ? "CPF" : "CNPJ"}</Label><Input value={editForm.cpf_cnpj} onChange={e => setEditForm({ ...editForm, cpf_cnpj: applyCpfCnpjMask(e.target.value, editForm.tipo_pessoa) })} placeholder={editForm.tipo_pessoa === "PF" ? "000.000.000-00" : "00.000.000/0000-00"} /></div>
                  </div>

                  {/* Nome + Razão Social */}
                  {editForm.tipo_pessoa === "PJ" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Nome *</Label><Input value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} placeholder="Cliente Teste" /></div>
                      <div><Label>Razão Social</Label><Input value={editForm.razao_social} onChange={e => setEditForm({ ...editForm, razao_social: e.target.value })} placeholder="Razão social (se PJ)" /></div>
                    </div>
                  ) : (
                    <div><Label>Nome *</Label><Input value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} placeholder="Cliente Teste" /></div>
                  )}

                  {/* Nome da Empresa */}
                  {editForm.tipo_pessoa === "PJ" && (
                    <div><Label>Nome da Empresa</Label><Input value={editForm.nome_empresa} onChange={e => setEditForm({ ...editForm, nome_empresa: e.target.value })} placeholder="Nome da empresa" /></div>
                  )}

                  {/* E-mails */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>E-mails</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addEmail}><Plus className="h-3 w-3" /> Adicionar</Button>
                    </div>
                    <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addEmail())} />
                    {editForm.emails.length > 0 ? (
                      <div className="space-y-1 mt-2">{editForm.emails.map((em, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2.5 py-1.5 text-sm">
                          <span>{em}</span>
                          <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeEmail(idx)}><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}</div>
                    ) : <p className="text-xs text-muted-foreground mt-1.5">Nenhum e-mail cadastrado</p>}
                  </div>

                  {/* Telefones */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>Telefones</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addPhone}><Plus className="h-3 w-3" /> Adicionar</Button>
                    </div>
                    <Input value={newPhone} onChange={e => setNewPhone(applyPhoneMask(e.target.value))} placeholder="(00) 00000-0000" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPhone())} />
                    {editForm.telefones.length > 0 ? (
                      <div className="space-y-1 mt-2">{editForm.telefones.map((ph, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2.5 py-1.5 text-sm">
                          <span>{formatPhone(ph)}</span>
                          <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removePhone(idx)}><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}</div>
                    ) : <p className="text-xs text-muted-foreground mt-1.5">Nenhum telefone cadastrado</p>}
                  </div>

                  {/* Endereço */}
                  <div className="space-y-3">
                    <Label className="font-semibold text-sm">Endereço</Label>
                    <div className="grid grid-cols-[2fr_1fr_2fr] gap-3">
                      <div><Label className="text-xs">CEP</Label><Input value={editForm.cep} onChange={e => setEditForm({ ...editForm, cep: applyCepMask(e.target.value) })} placeholder="00000-000" /></div>
                      <div><Label className="text-xs">Estado</Label>
                        <Select value={editForm.estado || "__none__"} onValueChange={v => setEditForm({ ...editForm, estado: v === "__none__" ? "" : v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{[<SelectItem key="__none__" value="__none__">Selecione</SelectItem>, ...ESTADOS_BR.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)]}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Cidade</Label><Input value={editForm.cidade} onChange={e => setEditForm({ ...editForm, cidade: e.target.value })} placeholder="Cidade" /></div>
                    </div>
                    <div className="grid grid-cols-[3fr_1fr_2fr] gap-3">
                      <div><Label className="text-xs">Endereço</Label><Input value={editForm.endereco} onChange={e => setEditForm({ ...editForm, endereco: e.target.value })} placeholder="Rua, Avenida, etc." /></div>
                      <div><Label className="text-xs">Número</Label><Input value={editForm.numero} onChange={e => setEditForm({ ...editForm, numero: e.target.value })} placeholder="Nº" /></div>
                      <div><Label className="text-xs">Bairro</Label><Input value={editForm.bairro} onChange={e => setEditForm({ ...editForm, bairro: e.target.value })} placeholder="Bairro" /></div>
                    </div>
                    <div><Label className="text-xs">Complemento</Label><Input value={editForm.complemento} onChange={e => setEditForm({ ...editForm, complemento: e.target.value })} placeholder="Apto, Sala, Bloco, etc." /></div>
                  </div>

                  {/* Observações */}
                  <div><Label>Observações</Label><Textarea rows={4} value={editForm.observacoes} onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })} placeholder="Observações gerais sobre o cliente" /></div>

                  {drawerMode === "edit" && (
                    <div className="flex items-center gap-2">
                      <Switch checked={editForm.ativo} onCheckedChange={v => setEditForm({ ...editForm, ativo: v })} />
                      <Label>{editForm.ativo ? "Ativo" : "Inativo"}</Label>
                    </div>
                  )}
                </div>
                <SheetFooter className="flex-row justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={cancelEdit}>Cancelar</Button>
                  <Button onClick={handleFormSave}>{drawerMode === "create" ? "Salvar" : "Salvar Alterações"}</Button>
                </SheetFooter>
              </>
            )}
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}

/* ─── Fornecedores ─── */
function FornecedoresTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [filterTipo, setFilterTipo] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit" | "create">("view");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    nome: "", tipo_pessoa: "PJ", cpf_cnpj: "", razao_social: "",
    emails: [] as string[], telefones: [] as string[],
    cep: "", estado: "", cidade: "", endereco: "", numero: "", bairro: "", complemento: "",
    observacoes: "", ativo: true,
  });
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("fornecedores").select("*").order("nome"); setItems(data || []); }

  const filtered = items.filter(i => {
    if (search) {
      const s = search.toLowerCase();
      if (!i.nome.toLowerCase().includes(s) && !(i.cpf_cnpj || "").includes(s) && !(i.email || "").toLowerCase().includes(s)) return false;
    }
    if (filterTipo !== "__all__" && i.tipo_pessoa !== filterTipo) return false;
    if (filterStatus === "ativo" && !i.ativo) return false;
    if (filterStatus === "inativo" && i.ativo) return false;
    return true;
  });

  function formatCpfCnpj(value: string | null, tipo: string) {
    if (!value) return "—";
    const d = value.replace(/\D/g, "");
    if (tipo === "PF" && d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    if (tipo === "PJ" && d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    return value;
  }

  function formatPhone(value: string | null) {
    if (!value) return "—";
    const d = value.replace(/\D/g, "");
    if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    return value;
  }

  function applyCpfCnpjMask(value: string, tipo: string) {
    const d = value.replace(/\D/g, "");
    if (tipo === "PF") return d.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return d.slice(0, 14).replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }

  function applyPhoneMask(value: string) {
    const d = value.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.replace(/(\d{1,2})/, "($1");
    if (d.length <= 7) return d.replace(/(\d{2})(\d{1,5})/, "($1) $2");
    return d.replace(/(\d{2})(\d{5})(\d{1,4})/, "($1) $2-$3");
  }

  function applyCepMask(value: string) {
    const d = value.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 5) return d;
    return d.replace(/(\d{5})(\d{1,3})/, "$1-$2");
  }

  function buildAddressString(item: any) {
    const parts: string[] = [];
    if (item.endereco) {
      let line = item.endereco;
      if (item.numero) line += `, ${item.numero}`;
      if (item.complemento) line += `, ${item.complemento}`;
      parts.push(line);
    }
    if (item.bairro) parts.push(item.bairro);
    const cityState = [item.cidade, item.estado].filter(Boolean).join("/");
    if (cityState) parts.push(cityState);
    if (item.cep) parts.push(item.cep);
    return parts.join(" - ");
  }

  function openCreate() {
    setSelectedItem(null);
    setEditForm({ nome: "", tipo_pessoa: "PJ", cpf_cnpj: "", razao_social: "", emails: [], telefones: [], cep: "", estado: "", cidade: "", endereco: "", numero: "", bairro: "", complemento: "", observacoes: "", ativo: true });
    setNewEmail(""); setNewPhone("");
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
      tipo_pessoa: selectedItem.tipo_pessoa || "PJ",
      cpf_cnpj: selectedItem.cpf_cnpj || "",
      razao_social: selectedItem.razao_social || "",
      emails: selectedItem.emails?.length ? selectedItem.emails : (selectedItem.email ? [selectedItem.email] : []),
      telefones: selectedItem.telefones?.length ? selectedItem.telefones : (selectedItem.telefone ? [selectedItem.telefone] : []),
      cep: selectedItem.cep || "",
      estado: selectedItem.estado || "",
      cidade: selectedItem.cidade || "",
      endereco: selectedItem.endereco || "",
      numero: selectedItem.numero || "",
      bairro: selectedItem.bairro || "",
      complemento: selectedItem.complemento || "",
      observacoes: selectedItem.observacoes || "",
      ativo: selectedItem.ativo ?? true,
    });
    setNewEmail(""); setNewPhone("");
    setDrawerMode("edit");
  }

  function cancelEdit() {
    if (drawerMode === "create") { setDrawerOpen(false); return; }
    setDrawerMode("view");
  }

  function addEmail() {
    const email = newEmail.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("E-mail inválido"); return; }
    if (editForm.emails.includes(email)) { toast.error("E-mail já cadastrado"); return; }
    setEditForm({ ...editForm, emails: [...editForm.emails, email] });
    setNewEmail("");
  }

  function removeEmail(idx: number) {
    setEditForm({ ...editForm, emails: editForm.emails.filter((_, i) => i !== idx) });
  }

  function addPhone() {
    const phone = newPhone.trim();
    if (!phone) return;
    if (editForm.telefones.includes(phone)) { toast.error("Telefone já cadastrado"); return; }
    setEditForm({ ...editForm, telefones: [...editForm.telefones, phone] });
    setNewPhone("");
  }

  function removePhone(idx: number) {
    setEditForm({ ...editForm, telefones: editForm.telefones.filter((_, i) => i !== idx) });
  }

  async function handleFormSave() {
    if (!editForm.nome.trim()) { toast.error("Nome é obrigatório"); return; }

    const payload: any = {
      nome: editForm.nome, tipo_pessoa: editForm.tipo_pessoa, cpf_cnpj: editForm.cpf_cnpj || null,
      razao_social: editForm.tipo_pessoa === "PJ" ? (editForm.razao_social || null) : null,
      emails: editForm.emails.length > 0 ? editForm.emails : [],
      telefones: editForm.telefones.length > 0 ? editForm.telefones : [],
      email: editForm.emails[0] || null,
      telefone: editForm.telefones[0] || null,
      cep: editForm.cep || null, estado: editForm.estado || null, cidade: editForm.cidade || null,
      endereco: editForm.endereco || null, numero: editForm.numero || null, bairro: editForm.bairro || null,
      complemento: editForm.complemento || null, observacoes: editForm.observacoes || null,
    };

    if (drawerMode === "create") {
      const { error } = await supabase.from("fornecedores").insert(payload);
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Fornecedor criado!");
      setDrawerOpen(false);
    } else {
      payload.ativo = editForm.ativo;
      const { error } = await supabase.from("fornecedores").update(payload).eq("id", selectedItem.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Fornecedor atualizado com sucesso");
      const updated = { ...selectedItem, ...payload };
      setSelectedItem(updated);
      setDrawerMode("view");
    }
    load();
  }

  async function handleDelete() {
    if (!selectedItem) return;
    const { error } = await supabase.from("fornecedores").delete().eq("id", selectedItem.id);
    if (error) { toast.error("Erro ao excluir fornecedor"); return; }
    toast.success("Fornecedor excluído com sucesso");
    setDeleteDialogOpen(false);
    setDrawerOpen(false);
    load();
  }

  function handleCopyData() {
    if (!selectedItem) return;
    const docLabel = selectedItem.tipo_pessoa === "PF" ? "CPF" : "CNPJ";
    const emails = selectedItem.emails?.length ? selectedItem.emails.join(", ") : (selectedItem.email || "—");
    const phones = selectedItem.telefones?.length ? selectedItem.telefones.map((t: string) => formatPhone(t)).join(", ") : formatPhone(selectedItem.telefone);
    let text = `Nome: ${selectedItem.nome}`;
    if (selectedItem.tipo_pessoa === "PJ") text += `\nRazão Social: ${selectedItem.razao_social || "—"}`;
    text += `\n${docLabel}: ${formatCpfCnpj(selectedItem.cpf_cnpj, selectedItem.tipo_pessoa)}`;
    text += `\nE-mails: ${emails}`;
    text += `\nTelefones: ${phones}`;
    const addr = buildAddressString(selectedItem);
    text += `\nEndereço: ${addr || "—"}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Dados do fornecedor copiados!");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("fornecedores").update({ ativo: !ativo }).eq("id", id); load();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todos os Tipos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os Tipos</SelectItem>
                <SelectItem value="PF">Pessoa Física</SelectItem>
                <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Todos os Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os Status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="gap-1" onClick={openCreate}><Plus className="h-4 w-4" /> Novo Fornecedor</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Documento</TableHead><TableHead>E-mail</TableHead><TableHead>Telefone</TableHead><TableHead>Ativo</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id} className="group cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openDrawer(i)}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell><Badge variant="outline">{i.tipo_pessoa}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatCpfCnpj(i.cpf_cnpj, i.tipo_pessoa)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.emails?.length ? i.emails[0] : (i.email || "—")}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.telefones?.length ? formatPhone(i.telefones[0]) : formatPhone(i.telefone)}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}><Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} /></TableCell>
                <TableCell><Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum fornecedor encontrado para os filtros selecionados</TableCell></TableRow>}
          </TableBody>
        </Table>

        <Sheet open={drawerOpen} onOpenChange={(v) => { setDrawerOpen(v); if (!v) setDrawerMode("view"); }}>
          <SheetContent className="flex flex-col w-full sm:max-w-[520px] overflow-x-hidden">
            <SheetHeader>
              <SheetTitle>{drawerMode === "view" ? "Detalhes do Fornecedor" : drawerMode === "create" ? "Novo Fornecedor" : "Editar Fornecedor"}</SheetTitle>
            </SheetHeader>

            {/* View Mode */}
            {drawerMode === "view" && selectedItem && (
              <>
                <div className="flex-1 space-y-5 py-4 overflow-y-auto animate-fade-in">
                  <div><span className="text-xs text-muted-foreground">Nome</span><p className="text-sm font-medium mt-0.5">{selectedItem.nome}</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-xs text-muted-foreground">Tipo</span><div className="mt-0.5"><Badge variant="outline">{selectedItem.tipo_pessoa === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</Badge></div></div>
                    <div><span className="text-xs text-muted-foreground">Documento</span><p className="text-sm font-medium mt-0.5">{formatCpfCnpj(selectedItem.cpf_cnpj, selectedItem.tipo_pessoa)}</p></div>
                  </div>
                  {selectedItem.tipo_pessoa === "PJ" && selectedItem.razao_social && (
                    <div><span className="text-xs text-muted-foreground">Razão Social</span><p className="text-sm font-medium mt-0.5">{selectedItem.razao_social}</p></div>
                  )}
                  <div><span className="text-xs text-muted-foreground">Status</span><p className="text-sm font-medium mt-0.5">{selectedItem.ativo ? "Ativo" : "Inativo"}</p></div>

                  <div>
                    <span className="text-xs text-muted-foreground">E-mails</span>
                    {(selectedItem.emails?.length > 0) ? (
                      <div className="space-y-0.5 mt-0.5">{selectedItem.emails.map((e: string, idx: number) => <p key={idx} className="text-sm font-medium">{e}</p>)}</div>
                    ) : selectedItem.email ? <p className="text-sm font-medium mt-0.5">{selectedItem.email}</p> : <p className="text-sm text-muted-foreground mt-0.5">Nenhum e-mail cadastrado</p>}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Telefones</span>
                    {(selectedItem.telefones?.length > 0) ? (
                      <div className="space-y-0.5 mt-0.5">{selectedItem.telefones.map((t: string, idx: number) => <p key={idx} className="text-sm font-medium">{formatPhone(t)}</p>)}</div>
                    ) : selectedItem.telefone ? <p className="text-sm font-medium mt-0.5">{formatPhone(selectedItem.telefone)}</p> : <p className="text-sm text-muted-foreground mt-0.5">Nenhum telefone cadastrado</p>}
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">Endereço</span>
                    <p className="text-sm font-medium mt-0.5">{buildAddressString(selectedItem) || "Nenhum endereço cadastrado"}</p>
                  </div>

                  <div><span className="text-xs text-muted-foreground">Observações</span><p className="text-sm font-medium mt-0.5 whitespace-pre-wrap">{selectedItem.observacoes || "Sem observações"}</p></div>

                  <Button variant="outline" className="w-full gap-2" onClick={handleCopyData}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copiado!" : "Copiar Dados"}
                  </Button>
                </div>
                <SheetFooter className="flex-row !justify-between gap-2 pt-4 border-t">
                  <Button variant="ghost" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDrawerOpen(false)}>Fechar</Button>
                    <Button className="gap-1.5" onClick={startEdit}><Pencil className="h-3.5 w-3.5" /> Editar Fornecedor</Button>
                  </div>
                </SheetFooter>

                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir fornecedor</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o fornecedor <strong>{selectedItem.nome}</strong>? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Excluir Fornecedor</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Edit/Create Mode */}
            {(drawerMode === "edit" || drawerMode === "create") && (
              <>
                <div className="flex-1 space-y-4 py-4 overflow-y-auto animate-fade-in">
                  {/* Nome + Tipo */}
                  <div className="grid grid-cols-[3fr_2fr] gap-3">
                    <div><Label>Nome *</Label><Input value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} placeholder="Nome fantasia ou nome completo" /></div>
                    <div><Label>Tipo</Label>
                      <Select value={editForm.tipo_pessoa} onValueChange={v => setEditForm({ ...editForm, tipo_pessoa: v, cpf_cnpj: "" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PF">Pessoa Física</SelectItem>
                          <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Razão Social (PJ) + Documento */}
                  {editForm.tipo_pessoa === "PJ" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Razão Social</Label><Input value={editForm.razao_social} onChange={e => setEditForm({ ...editForm, razao_social: e.target.value })} placeholder="Razão social (se PJ)" /></div>
                      <div><Label>CNPJ</Label><Input value={editForm.cpf_cnpj} onChange={e => setEditForm({ ...editForm, cpf_cnpj: applyCpfCnpjMask(e.target.value, "PJ") })} placeholder="00.000.000/0001-00" /></div>
                    </div>
                  ) : (
                    <div><Label>CPF</Label><Input value={editForm.cpf_cnpj} onChange={e => setEditForm({ ...editForm, cpf_cnpj: applyCpfCnpjMask(e.target.value, "PF") })} placeholder="000.000.000-00" /></div>
                  )}

                  {/* E-mails */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>E-mails</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addEmail}><Plus className="h-3 w-3" /> Adicionar</Button>
                    </div>
                    <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addEmail())} />
                    {editForm.emails.length > 0 ? (
                      <div className="space-y-1 mt-2">{editForm.emails.map((em, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2.5 py-1.5 text-sm">
                          <span>{em}</span>
                          <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeEmail(idx)}><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}</div>
                    ) : <p className="text-xs text-muted-foreground mt-1.5">Nenhum e-mail cadastrado</p>}
                  </div>

                  {/* Telefones */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>Telefones</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addPhone}><Plus className="h-3 w-3" /> Adicionar</Button>
                    </div>
                    <Input value={newPhone} onChange={e => setNewPhone(applyPhoneMask(e.target.value))} placeholder="(00) 00000-0000" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPhone())} />
                    {editForm.telefones.length > 0 ? (
                      <div className="space-y-1 mt-2">{editForm.telefones.map((ph, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2.5 py-1.5 text-sm">
                          <span>{formatPhone(ph)}</span>
                          <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removePhone(idx)}><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}</div>
                    ) : <p className="text-xs text-muted-foreground mt-1.5">Nenhum telefone cadastrado</p>}
                  </div>

                  {/* Endereço */}
                  <div className="space-y-3">
                    <Label className="font-semibold text-sm">Endereço</Label>
                    <div className="grid grid-cols-[2fr_1fr_2fr] gap-3">
                      <div><Label className="text-xs">CEP</Label><Input value={editForm.cep} onChange={e => setEditForm({ ...editForm, cep: applyCepMask(e.target.value) })} placeholder="00000-000" /></div>
                      <div><Label className="text-xs">Estado</Label>
                        <Select value={editForm.estado || "__none__"} onValueChange={v => setEditForm({ ...editForm, estado: v === "__none__" ? "" : v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{[<SelectItem key="__none__" value="__none__">Selecione</SelectItem>, ...ESTADOS_BR.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)]}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Cidade</Label><Input value={editForm.cidade} onChange={e => setEditForm({ ...editForm, cidade: e.target.value })} placeholder="Cidade" /></div>
                    </div>
                    <div className="grid grid-cols-[3fr_1fr_2fr] gap-3">
                      <div><Label className="text-xs">Endereço</Label><Input value={editForm.endereco} onChange={e => setEditForm({ ...editForm, endereco: e.target.value })} placeholder="Rua, Avenida, etc." /></div>
                      <div><Label className="text-xs">Número</Label><Input value={editForm.numero} onChange={e => setEditForm({ ...editForm, numero: e.target.value })} placeholder="Nº" /></div>
                      <div><Label className="text-xs">Bairro</Label><Input value={editForm.bairro} onChange={e => setEditForm({ ...editForm, bairro: e.target.value })} placeholder="Bairro" /></div>
                    </div>
                    <div><Label className="text-xs">Complemento</Label><Input value={editForm.complemento} onChange={e => setEditForm({ ...editForm, complemento: e.target.value })} placeholder="Apto, Sala, Bloco, etc." /></div>
                  </div>

                  {/* Observações */}
                  <div><Label>Observações</Label><Textarea rows={4} value={editForm.observacoes} onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })} placeholder="Observações gerais sobre o fornecedor" /></div>

                  {drawerMode === "edit" && (
                    <div className="flex items-center gap-2">
                      <Switch checked={editForm.ativo} onCheckedChange={v => setEditForm({ ...editForm, ativo: v })} />
                      <Label>{editForm.ativo ? "Ativo" : "Inativo"}</Label>
                    </div>
                  )}
                </div>
                <SheetFooter className="flex-row justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={cancelEdit}>Cancelar</Button>
                  <Button onClick={handleFormSave}>{drawerMode === "create" ? "Salvar" : "Salvar Alterações"}</Button>
                </SheetFooter>
              </>
            )}
          </SheetContent>
        </Sheet>
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
