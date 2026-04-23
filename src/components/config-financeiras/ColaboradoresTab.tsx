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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Eye, X, Copy, Check, Trash2, Landmark, FileText, Phone, MapPin, StickyNote, Briefcase, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { FormMode, FormPageShell, FormSection, DetailField, ESTADOS_BR, applyCpfMask, applyPhoneMask, applyCepMask, applyMoneyMask, parseMoney, formatMoneyForInput, formatCpfCnpj, formatPhone, formatDateBR, buildAddressString, applyAgenciaMask, applyContaMask, applyPixMask, detectPixType, pixTypeLabel } from "./shared";
import { HelpTooltip } from "@/components/HelpTooltip";
import { useURLState } from "@/hooks/useURLState";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Form = {
  nome: string; cargo: string; cpf: string;
  emails: string[]; telefones: string[];
  banco: string; agencia: string; conta: string; tipo_conta: string; chaves_pix: string[];
  cep: string; estado: string; cidade: string; endereco: string; numero: string; bairro: string; complemento: string;
  data_admissao: string; salario_base: string;
  observacoes: string; ativo: boolean;
};
const empty: Form = { nome: "", cargo: "", cpf: "", emails: [], telefones: [], banco: "", agencia: "", conta: "", tipo_conta: "corrente", chaves_pix: [], cep: "", estado: "", cidade: "", endereco: "", numero: "", bairro: "", complemento: "", data_admissao: "", salario_base: "0,00", observacoes: "", ativo: true };
const formatTipoConta = (t: string) => t === "poupanca" ? "Poupança" : "Corrente";

export default function ColaboradoresTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [filterCargo, setFilterCargo] = useURLState<string>("cargo", "__all__");
  const [filterStatus, setFilterStatus] = useURLState<string>("status", "__all__");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [mode, setMode] = useState<FormMode>("list");
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<Form>(empty);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPix, setNewPix] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      setCurrentUserId(user?.id || null);
      setCurrentUserEmail(user?.email?.toLowerCase() || null);
      if (!user?.id) return;
      const { data: role } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!role);
    });
  }, []);
  async function load() { const { data } = await supabase.from("colaboradores" as any).select("*").order("nome"); setItems((data as any[]) || []); }

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

  const normalizedUserEmail = currentUserEmail?.trim().toLowerCase() || null;
  const isOwnColaborador = (item: any) => {
    const itemEmails = ((item?.emails || []) as string[]).map((email) => email.trim().toLowerCase());
    return !!item && ((currentUserId && item.created_by === currentUserId) || (normalizedUserEmail && itemEmails.includes(normalizedUserEmail)));
  };
  const canEditColaborador = (item: any) => isAdmin || isOwnColaborador(item);
  const canDeleteColaborador = () => isAdmin;
  const canManageStatus = () => isAdmin;
  const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ");

  function openNew() {
    if (!isAdmin) { toast.error("Apenas administradores podem cadastrar colaboradores"); return; }
    setSelected(null); setForm(empty); setNewEmail(""); setNewPhone(""); setNewPix(""); setMode("new");
  }
  function openView(item: any) { setSelected(item); canEditColaborador(item) ? startEdit(item) : setMode("view"); }
  function startEdit(item = selected) {
    if (!item || !canEditColaborador(item)) return;
    setSelected(item);
    setForm({
      nome: item.nome || "", cargo: item.cargo || "", cpf: item.cpf || "",
      emails: item.emails || [], telefones: item.telefones || [],
      banco: item.banco || "", agencia: applyAgenciaMask(item.agencia || ""), conta: applyContaMask(item.conta || ""),
      tipo_conta: item.tipo_conta || "corrente", chaves_pix: (item.chaves_pix || []).map((pix: string) => applyPixMask(pix)),
      cep: applyCepMask(item.cep || ""), estado: item.estado || "", cidade: item.cidade || "",
      endereco: item.endereco || "", numero: item.numero || "", bairro: item.bairro || "",
      complemento: item.complemento || "",
      data_admissao: item.data_admissao || "",
      salario_base: formatMoneyForInput(Number(item.salario_base ?? 0)),
      observacoes: item.observacoes || "", ativo: item.ativo ?? true,
    });
    setNewEmail(""); setNewPhone(""); setNewPix(""); setMode("edit");
  }
  function backToList() { setMode("list"); setSelected(null); }
  function cancelEdit() { if (mode === "new" || !selected || canEditColaborador(selected)) backToList(); else setMode("view"); }

  function addEmail() {
    const e = newEmail.trim().toLowerCase(); if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error("E-mail inválido"); return; }
    if (form.emails.includes(e)) { toast.error("E-mail já cadastrado"); return; }
    setForm({ ...form, emails: [...form.emails, e] }); setNewEmail("");
  }
  function addPhone() {
    const p = newPhone.trim(); if (!p) return;
    if (form.telefones.includes(p)) { toast.error("Telefone já cadastrado"); return; }
    setForm({ ...form, telefones: [...form.telefones, p] }); setNewPhone("");
  }
  function addPix() {
    const v = applyPixMask(newPix.trim()); if (!v) return;
    if (form.chaves_pix.includes(v)) { toast.error("Chave PIX já cadastrada"); return; }
    setForm({ ...form, chaves_pix: [...form.chaves_pix, v] }); setNewPix("");
  }

  function mergePendingInputs() {
    const nextForm = {
      ...form,
      emails: [...form.emails],
      telefones: [...form.telefones],
      chaves_pix: [...form.chaves_pix],
    };

    const pendingEmail = newEmail.trim();
    if (pendingEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pendingEmail)) {
        toast.error("E-mail inválido");
        return null;
      }
      if (!nextForm.emails.includes(pendingEmail)) nextForm.emails.push(pendingEmail);
    }

    const pendingPhone = newPhone.trim();
    if (pendingPhone && !nextForm.telefones.includes(pendingPhone)) nextForm.telefones.push(pendingPhone);

    const pendingPix = newPix.trim();
    if (pendingPix && !nextForm.chaves_pix.includes(pendingPix)) nextForm.chaves_pix.push(pendingPix);

    return nextForm;
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const nextForm = mergePendingInputs();
    if (!nextForm) return;

    const salario = parseMoney(nextForm.salario_base);
    const payload: any = {
      nome: nextForm.nome, cargo: nextForm.cargo || null, cpf: nextForm.cpf || null,
      emails: nextForm.emails, telefones: nextForm.telefones,
      banco: nextForm.banco || null, agencia: nextForm.agencia || null, conta: nextForm.conta || null,
      tipo_conta: nextForm.tipo_conta, chaves_pix: nextForm.chaves_pix,
      cep: nextForm.cep || null, estado: nextForm.estado || null, cidade: nextForm.cidade || null,
      endereco: nextForm.endereco || null, numero: nextForm.numero || null, bairro: nextForm.bairro || null,
      complemento: nextForm.complemento || null,
      data_admissao: nextForm.data_admissao || null,
      salario_base: isNaN(salario) ? 0 : salario,
      observacoes: nextForm.observacoes || null,
    };
    setForm(nextForm);
    setNewEmail("");
    setNewPhone("");
    setNewPix("");
    if (mode === "new") {
      const { data: userData } = await supabase.auth.getUser();
      payload.created_by = userData.user?.id || null;
      const { error } = await supabase.from("colaboradores" as any).insert(payload);
      if (error) { toast.error("Erro ao cadastrar colaborador. Tente novamente."); return; }
      toast.success("Colaborador cadastrado com sucesso");
      backToList(); await load();
    } else {
      payload.ativo = nextForm.ativo;
      const { data: updated, error } = await supabase
        .from("colaboradores" as any)
        .update(payload)
        .eq("id", selected.id)
        .select()
        .maybeSingle();
      if (error || !updated) { toast.error("Erro ao atualizar colaborador. Tente novamente."); return; }
      toast.success("Colaborador atualizado com sucesso");
      setSelected(updated as any); setMode("view"); await load();
    }
  }
  async function handleDelete() {
    if (!selected) return;
    const { error } = await supabase.from("colaboradores" as any).delete().eq("id", selected.id);
    if (error) { toast.error("Erro ao excluir colaborador"); return; }
    toast.success("Colaborador excluído com sucesso");
    setDeleteOpen(false); backToList(); load();
  }
  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("colaboradores" as any).update({ ativo: !ativo }).eq("id", id); load();
  }
  function handleCopyBank() {
    if (!selected) return;
    const pix = selected.chaves_pix?.length ? selected.chaves_pix.join(", ") : "—";
    const text = `Nome: ${selected.nome}\nBanco: ${selected.banco || "—"}\nAgência: ${selected.agencia || "—"}\nConta: ${selected.conta || "—"}\nTipo: ${formatTipoConta(selected.tipo_conta)}\nPIX: ${pix}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Dados bancários copiados!");
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }
  const canSeeSalary = selected && currentUserId && selected.created_by === currentUserId;

  /* ─── VIEW ─── */
  if (mode === "view" && selected) {
    return (
      <FormPageShell
        title="Detalhes do Colaborador"
        subtitle="Visualize os dados do colaborador"
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
          <DetailField label="Nome Completo" value={selected.nome} />
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Cargo" value={selected.cargo} />
            <DetailField label="CPF" value={formatCpfCnpj(selected.cpf, "PF")} />
          </div>
          <DetailField label="Status" value={selected.ativo ? "Ativo" : "Inativo"} />
        </FormSection>

        <FormSection icon={Phone} title="Contatos">
          <div>
            <span className="text-xs text-muted-foreground">E-mails</span>
            {selected.emails?.length > 0 ? (
              <div className="space-y-0.5 mt-0.5">{selected.emails.map((e: string, i: number) => <p key={i} className="text-sm font-medium">{e}</p>)}</div>
            ) : <p className="text-sm text-muted-foreground mt-0.5">—</p>}
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Telefones</span>
            {selected.telefones?.length > 0 ? (
              <div className="space-y-0.5 mt-0.5">{selected.telefones.map((t: string, i: number) => <p key={i} className="text-sm font-medium">{formatPhone(t)}</p>)}</div>
            ) : <p className="text-sm text-muted-foreground mt-0.5">—</p>}
          </div>
        </FormSection>

        <FormSection
          icon={Landmark}
          title="Dados Bancários"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-7 px-2 text-[13px] text-slate-500 hover:text-slate-700"
              onClick={handleCopyBank}
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
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Banco" value={selected.banco} />
            <DetailField label="Tipo da Conta" value={formatTipoConta(selected.tipo_conta)} />
          </div>
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

        <FormSection icon={MapPin} title="Endereço">
          <DetailField label="Endereço Completo" value={buildAddressString(selected)} />
        </FormSection>

        <FormSection icon={Briefcase} title="Informações Contratuais">
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Data de Admissão" value={formatDateBR(selected.data_admissao)} />
            {canSeeSalary && <DetailField label="Salário Base" value={formatCurrency(Number(selected.salario_base ?? 0))} />}
          </div>
          <DetailField label="Observações" value={selected.observacoes ? <span className="whitespace-pre-wrap">{selected.observacoes}</span> : null} />
        </FormSection>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir colaborador</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir o colaborador <strong>{selected.nome}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Excluir Colaborador</AlertDialogAction>
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
        title={mode === "new" ? "Novo Colaborador" : "Editar Colaborador"}
        subtitle={mode === "new" ? "Preencha os dados do novo colaborador" : "Atualize os dados do colaborador"}
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
          <div><Label>Nome Completo *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cargo</Label><Input value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} placeholder="Ex: Desenvolvedor" /></div>
            <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm({ ...form, cpf: applyCpfMask(e.target.value) })} placeholder="000.000.000-00" /></div>
          </div>
          {mode === "edit" && (
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} />
              <Label>{form.ativo ? "Ativo" : "Inativo"}</Label>
            </div>
          )}
        </FormSection>

        <FormSection icon={Phone} title="Contatos">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>E-mails</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addEmail}><Plus className="h-3 w-3" /> Adicionar</Button>
            </div>
            <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addEmail())} />
            {form.emails.length > 0 ? (
              <div className="space-y-1 mt-2">{form.emails.map((em, idx) => (
                <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2.5 py-1.5 text-sm">
                  <span>{em}</span>
                  <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => setForm({ ...form, emails: form.emails.filter((_, i) => i !== idx) })}><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}</div>
            ) : <p className="text-xs text-muted-foreground mt-1.5">Nenhum e-mail cadastrado</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Telefones</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addPhone}><Plus className="h-3 w-3" /> Adicionar</Button>
            </div>
            <Input value={newPhone} onChange={e => setNewPhone(applyPhoneMask(e.target.value))} placeholder="(00) 00000-0000" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPhone())} />
            {form.telefones.length > 0 ? (
              <div className="space-y-1 mt-2">{form.telefones.map((ph, idx) => (
                <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2.5 py-1.5 text-sm">
                  <span>{formatPhone(ph)}</span>
                  <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => setForm({ ...form, telefones: form.telefones.filter((_, i) => i !== idx) })}><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}</div>
            ) : <p className="text-xs text-muted-foreground mt-1.5">Nenhum telefone cadastrado</p>}
          </div>
        </FormSection>

        <FormSection icon={Landmark} title="Dados Bancários">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Banco</Label><Input value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} placeholder="Ex: Itaú" /></div>
            <div><Label>Agência</Label><Input value={form.agencia} onChange={e => setForm({ ...form, agencia: e.target.value })} placeholder="1234" /></div>
            <div><Label>Conta</Label><Input value={form.conta} onChange={e => setForm({ ...form, conta: e.target.value })} placeholder="12345-6" /></div>
          </div>
          <div className="w-1/2">
            <Label>Tipo da Conta</Label>
            <Select value={form.tipo_conta} onValueChange={v => setForm({ ...form, tipo_conta: v })}>
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
            {form.chaves_pix.length > 0 ? (
              <div className="space-y-1 mt-2">{form.chaves_pix.map((k, idx) => (
                <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2.5 py-1.5 text-sm">
                  <span>{k}</span>
                  <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => setForm({ ...form, chaves_pix: form.chaves_pix.filter((_, i) => i !== idx) })}><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}</div>
            ) : <p className="text-xs text-muted-foreground mt-1.5">Nenhuma chave PIX cadastrada</p>}
          </div>
        </FormSection>

        <FormSection icon={MapPin} title="Endereço">
          <div className="grid grid-cols-[2fr_1fr_2fr] gap-3">
            <div><Label>CEP</Label><Input value={form.cep} onChange={e => setForm({ ...form, cep: applyCepMask(e.target.value) })} placeholder="00000-000" /></div>
            <div><Label>Estado</Label>
              <Select value={form.estado || "__none__"} onValueChange={v => setForm({ ...form, estado: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{[<SelectItem key="__none__" value="__none__">Selecione</SelectItem>, ...ESTADOS_BR.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)]}</SelectContent>
              </Select>
            </div>
            <div><Label>Cidade</Label><Input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} placeholder="Cidade" /></div>
          </div>
          <div className="grid grid-cols-[3fr_1fr_2fr] gap-3">
            <div><Label>Endereço</Label><Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, Avenida, etc." /></div>
            <div><Label>Número</Label><Input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="Nº" /></div>
            <div><Label>Bairro</Label><Input value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} placeholder="Bairro" /></div>
          </div>
          <div><Label>Complemento</Label><Input value={form.complemento} onChange={e => setForm({ ...form, complemento: e.target.value })} placeholder="Apto, Sala, Bloco, etc." /></div>
        </FormSection>

        <FormSection icon={Briefcase} title="Informações Contratuais">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data de Admissão</Label><Input type="date" value={form.data_admissao} onChange={e => setForm({ ...form, data_admissao: e.target.value })} /></div>
            <div><Label>Salário Base (R$)</Label><Input value={form.salario_base} onChange={e => setForm({ ...form, salario_base: applyMoneyMask(e.target.value) })} placeholder="0,00" /></div>
          </div>
        </FormSection>

        <FormSection icon={StickyNote} title="Observações">
          <div><Label>Observações</Label><Textarea rows={4} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações gerais sobre o colaborador" /></div>
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
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Novo Colaborador</Button>
            <HelpTooltip content="Cadastre funcionários e prestadores de serviço. Os dados bancários cadastrados aqui facilitam o registro de pagamentos." />
          </div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome Completo</TableHead><TableHead><div className="flex items-center gap-1">Cargo<HelpTooltip content="O cargo é informativo e ajuda a organizar seus colaboradores. Você pode usar qualquer descrição." /></div></TableHead><TableHead>Documento</TableHead><TableHead>E-mail</TableHead><TableHead>Telefone</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id} className="group cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openView(i)}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.cargo || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatCpfCnpj(i.cpf, "PF")}</TableCell>
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
      </CardContent>
    </Card>
  );
}
