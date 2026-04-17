import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Eye, X, Copy, Check, Trash2, Landmark, FileText, StickyNote, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { FormMode, FormPageShell, FormSection, DetailField, formatMoneyForInput, parseMoney } from "./shared";
import { HelpTooltip } from "@/components/HelpTooltip";
import { useURLState } from "@/hooks/useURLState";

type Form = { nome: string; banco: string; agencia: string; conta: string; tipo: string; saldo_inicial: string; moeda: string; ativo: boolean; chaves_pix: string[]; observacoes: string };
const empty: Form = { nome: "", banco: "", agencia: "", conta: "", tipo: "corrente", saldo_inicial: "0,00", moeda: "BRL", ativo: true, chaves_pix: [], observacoes: "" };

const formatTipo = (t: string) => t === "poupanca" ? "Poupança" : t === "investimento" ? "Investimento" : "Corrente";
const formatMoedaShort = (m: string) => m === "USD" ? "US$" : m === "EUR" ? "€" : "R$";
const formatMoeda = (m: string) => m === "USD" ? "Dólar (US$)" : m === "EUR" ? "Euro (€)" : "Real (R$)";

export default function ContasBancariasTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [filterBanco, setFilterBanco] = useURLState("banco", "__all__");
  const [filterTipo, setFilterTipo] = useURLState("tipo_conta", "__all__");
  const [filterMoeda, setFilterMoeda] = useURLState("moeda", "__all__");

  const [mode, setMode] = useState<FormMode>("list");
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<Form>(empty);
  const [newPix, setNewPix] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("contas_bancarias").select("*").order("nome"); setItems(data || []); }

  const bancos = Array.from(new Set(items.map(i => i.banco).filter(Boolean))).sort();
  const filtered = items.filter(i => {
    const s = search.toLowerCase();
    if (s && !i.nome.toLowerCase().includes(s) && !(i.banco || "").toLowerCase().includes(s)) return false;
    if (filterBanco !== "__all__" && i.banco !== filterBanco) return false;
    if (filterTipo !== "__all__" && i.tipo !== filterTipo) return false;
    if (filterMoeda !== "__all__" && i.moeda !== filterMoeda) return false;
    return true;
  });

  function openNew() { setSelected(null); setForm(empty); setNewPix(""); setMode("new"); }
  function openView(item: any) { setSelected(item); setMode("view"); }
  function startEdit() {
    if (!selected) return;
    setForm({
      nome: selected.nome || "", banco: selected.banco || "", agencia: selected.agencia || "", conta: selected.conta || "",
      tipo: selected.tipo || "corrente", saldo_inicial: formatMoneyForInput(Number(selected.saldo_inicial ?? 0)),
      moeda: selected.moeda || "BRL", ativo: selected.ativo ?? true,
      chaves_pix: selected.chaves_pix || [], observacoes: selected.observacoes || "",
    });
    setNewPix(""); setMode("edit");
  }
  function backToList() { setMode("list"); setSelected(null); }
  function cancelEdit() { if (mode === "new") backToList(); else setMode("view"); }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const saldo = parseMoney(form.saldo_inicial);
    if (isNaN(saldo)) { toast.error("Saldo inicial inválido"); return; }
    const payload: any = {
      nome: form.nome, banco: form.banco || null, agencia: form.agencia || null, conta: form.conta || null,
      tipo: form.tipo, saldo_inicial: saldo, moeda: form.moeda,
      chaves_pix: form.chaves_pix.length > 0 ? form.chaves_pix : null,
      observacoes: form.observacoes || null,
    };
    if (mode === "new") {
      const { error } = await supabase.from("contas_bancarias").insert(payload);
      if (error) { toast.error("Erro ao cadastrar conta bancária. Tente novamente."); return; }
      toast.success("Conta bancária criada!");
      backToList(); await load();
    } else {
      payload.ativo = form.ativo;
      const { data: updated, error } = await supabase
        .from("contas_bancarias")
        .update(payload)
        .eq("id", selected.id)
        .select()
        .maybeSingle();
      if (error || !updated) { toast.error("Erro ao atualizar conta bancária. Tente novamente."); return; }
      toast.success("Conta atualizada com sucesso");
      setSelected(updated); setMode("view"); await load();
    }
  }
  async function handleDelete() {
    if (!selected) return;
    const { error } = await supabase.from("contas_bancarias").delete().eq("id", selected.id);
    if (error) { toast.error("Erro ao excluir conta"); return; }
    toast.success("Conta excluída com sucesso");
    setDeleteOpen(false); backToList(); load();
  }
  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("contas_bancarias").update({ ativo: !ativo }).eq("id", id); load();
  }
  function handleCopy() {
    if (!selected) return;
    const pix = selected.chaves_pix?.length ? selected.chaves_pix.join(", ") : "Nenhuma";
    const text = `Banco: ${selected.banco || "—"}\nAgência: ${selected.agencia || "—"}\nConta: ${selected.conta || "—"}\nTipo: ${formatTipo(selected.tipo)}\nTitular: ${selected.nome}\nPIX: ${pix}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Dados bancários copiados!");
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }
  function addPix() {
    const v = newPix.trim(); if (!v) return;
    if (form.chaves_pix.includes(v)) { toast.error("Chave PIX já cadastrada"); return; }
    setForm({ ...form, chaves_pix: [...form.chaves_pix, v] }); setNewPix("");
  }

  /* ─── VIEW ─── */
  if (mode === "view" && selected) {
    return (
      <FormPageShell
        title="Detalhes da Conta Bancária"
        subtitle="Visualize os dados da conta bancária"
        onBack={backToList}
        footer={
          <>
            <Button variant="ghost" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={backToList}>Voltar</Button>
              <Button className="gap-1.5" onClick={startEdit}><Pencil className="h-4 w-4" /> Editar</Button>
            </div>
          </>
        }
      >
        <FormSection icon={FileText} title="Dados Principais">
          <DetailField label="Nome" value={selected.nome} />
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Tipo" value={formatTipo(selected.tipo)} />
            <DetailField label="Moeda" value={formatMoeda(selected.moeda)} />
          </div>
          <DetailField label="Saldo Inicial" value={formatCurrency(Number(selected.saldo_inicial ?? 0))} />
          <DetailField label="Status" value={selected.ativo ? "Ativo" : "Inativo"} />
        </FormSection>

        <FormSection
          icon={Landmark}
          title="Dados Bancários"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-7 px-2 text-[13px] text-slate-500 hover:text-slate-700"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar dados
                </>
              )}
            </Button>
          }
        >
          <DetailField label="Banco" value={selected.banco} />
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Agência" value={selected.agencia} />
            <DetailField label="Conta" value={selected.conta} />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Chaves PIX</span>
            {selected.chaves_pix?.length > 0 ? (
              <div className="space-y-0.5 mt-0.5">{selected.chaves_pix.map((k: string, i: number) => <p key={i} className="text-sm font-medium">{k}</p>)}</div>
            ) : <p className="text-sm text-muted-foreground mt-0.5">—</p>}
          </div>
        </FormSection>

        <FormSection icon={StickyNote} title="Observações">
          <DetailField label="Observações" value={selected.observacoes ? <span className="whitespace-pre-wrap">{selected.observacoes}</span> : null} />
        </FormSection>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir conta</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir a conta <strong>{selected.nome}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Excluir Conta</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </FormPageShell>
    );
  }

  /* ─── EDIT / NEW ─── */
  if (mode === "edit" || mode === "new") {
    return (
      <FormPageShell
        title={mode === "new" ? "Nova Conta Bancária" : "Editar Conta Bancária"}
        subtitle={mode === "new" ? "Preencha os dados da nova conta bancária" : "Atualize os dados da conta bancária"}
        onBack={cancelEdit}
        footer={
          <>
            <span />
            <div className="flex gap-2">
              <Button variant="outline" onClick={cancelEdit}>Cancelar</Button>
              <Button onClick={handleSave}>{mode === "new" ? "Salvar" : "Salvar Alterações"}</Button>
            </div>
          </>
        }
      >
        <FormSection icon={FileText} title="Dados Principais">
          <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Itaú Corrente" /></div>
          <div className="grid grid-cols-[2fr_3fr] gap-3">
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
          <div><Label>Saldo Inicial</Label><Input value={form.saldo_inicial} onChange={e => setForm({ ...form, saldo_inicial: e.target.value })} placeholder="0,00" /></div>
          {mode === "edit" && (
            <div className="flex items-center gap-3">
              <Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} />
              <Label>{form.ativo ? "Ativo" : "Inativo"}</Label>
            </div>
          )}
        </FormSection>

        <FormSection icon={Landmark} title="Dados Bancários">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Banco</Label><Input value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} placeholder="Itaú" /></div>
            <div><Label>Agência</Label><Input value={form.agencia} onChange={e => setForm({ ...form, agencia: e.target.value })} placeholder="1234" /></div>
            <div><Label>Conta</Label><Input value={form.conta} onChange={e => setForm({ ...form, conta: e.target.value })} placeholder="12345-6" /></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Chaves PIX</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addPix}><Plus className="h-3 w-3" /> Adicionar</Button>
            </div>
            <Input value={newPix} onChange={e => setNewPix(e.target.value)} placeholder="CPF, e-mail, telefone, chave aleatória..." onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPix())} />
            {form.chaves_pix.length > 0 ? (
              <div className="space-y-1 mt-2">{form.chaves_pix.map((k, idx) => (
                <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2.5 py-1.5 text-sm">
                  <span>{k}</span>
                  <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => setForm({ ...form, chaves_pix: form.chaves_pix.filter((_, j) => j !== idx) })}><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}</div>
            ) : <p className="text-xs text-muted-foreground mt-1.5">Nenhuma chave PIX cadastrada</p>}
          </div>
        </FormSection>

        <FormSection icon={StickyNote} title="Observações">
          <div><Label>Observações</Label><Textarea rows={4} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações sobre a conta..." /></div>
        </FormSection>
      </FormPageShell>
    );
  }

  /* ─── LIST ─── */
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filterBanco} onValueChange={setFilterBanco}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos os Bancos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os Bancos</SelectItem>
                {bancos.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <HelpTooltip content="Filtre as contas pelo banco, tipo (Corrente, Investimento, Poupança) ou moeda." />
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
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Nova Conta</Button>
            <HelpTooltip content="Cadastre suas contas bancárias para registrar movimentações e importar extratos." />
          </div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Banco</TableHead><TableHead>Tipo</TableHead><TableHead>Moeda</TableHead><TableHead><div className="flex items-center gap-1">Saldo Inicial<HelpTooltip content="O saldo inicial é o valor que a conta tinha no momento do cadastro. O saldo atual é calculado automaticamente com base nas movimentações registradas." /></div></TableHead><TableHead><div className="flex items-center gap-1">Ativo<HelpTooltip content="Contas inativas não aparecem nos dropdowns de seleção ao criar movimentações, mas seus dados históricos são preservados." /></div></TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id} className="group cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openView(i)}>
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
      </CardContent>
    </Card>
  );
}
