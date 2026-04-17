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
import { Plus, Pencil, Eye, X, Copy, Check, Trash2, FileText, Phone, MapPin, StickyNote } from "lucide-react";
import { FormMode, FormPageShell, FormSection, DetailField, ESTADOS_BR, applyCpfCnpjMask, applyPhoneMask, applyCepMask, formatCpfCnpj, formatPhone, buildAddressString } from "./shared";
import { HelpTooltip } from "@/components/HelpTooltip";

type Form = {
  nome: string; tipo_pessoa: "PF" | "PJ"; cpf_cnpj: string; razao_social: string;
  emails: string[]; telefones: string[];
  cep: string; estado: string; cidade: string; endereco: string; numero: string; bairro: string; complemento: string;
  observacoes: string; ativo: boolean;
};
const empty: Form = { nome: "", tipo_pessoa: "PJ", cpf_cnpj: "", razao_social: "", emails: [], telefones: [], cep: "", estado: "", cidade: "", endereco: "", numero: "", bairro: "", complemento: "", observacoes: "", ativo: true };

export default function FornecedoresTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [filterTipo, setFilterTipo] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");

  const [mode, setMode] = useState<FormMode>("list");
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<Form>(empty);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  function openNew() { setSelected(null); setForm(empty); setNewEmail(""); setNewPhone(""); setMode("new"); }
  function openView(item: any) { setSelected(item); setMode("view"); }
  function startEdit() {
    if (!selected) return;
    setForm({
      nome: selected.nome || "", tipo_pessoa: (selected.tipo_pessoa || "PJ") as "PF" | "PJ",
      cpf_cnpj: selected.cpf_cnpj || "", razao_social: selected.razao_social || "",
      emails: selected.emails?.length ? selected.emails : (selected.email ? [selected.email] : []),
      telefones: selected.telefones?.length ? selected.telefones : (selected.telefone ? [selected.telefone] : []),
      cep: selected.cep || "", estado: selected.estado || "", cidade: selected.cidade || "",
      endereco: selected.endereco || "", numero: selected.numero || "", bairro: selected.bairro || "",
      complemento: selected.complemento || "", observacoes: selected.observacoes || "", ativo: selected.ativo ?? true,
    });
    setNewEmail(""); setNewPhone(""); setMode("edit");
  }
  function backToList() { setMode("list"); setSelected(null); }
  function cancelEdit() { if (mode === "new") backToList(); else setMode("view"); }

  function addEmail() {
    const e = newEmail.trim(); if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error("E-mail inválido"); return; }
    if (form.emails.includes(e)) { toast.error("E-mail já cadastrado"); return; }
    setForm({ ...form, emails: [...form.emails, e] }); setNewEmail("");
  }
  function addPhone() {
    const p = newPhone.trim(); if (!p) return;
    if (form.telefones.includes(p)) { toast.error("Telefone já cadastrado"); return; }
    setForm({ ...form, telefones: [...form.telefones, p] }); setNewPhone("");
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload: any = {
      nome: form.nome, tipo_pessoa: form.tipo_pessoa, cpf_cnpj: form.cpf_cnpj || null,
      razao_social: form.tipo_pessoa === "PJ" ? (form.razao_social || null) : null,
      emails: form.emails, telefones: form.telefones,
      email: form.emails[0] || null, telefone: form.telefones[0] || null,
      cep: form.cep || null, estado: form.estado || null, cidade: form.cidade || null,
      endereco: form.endereco || null, numero: form.numero || null, bairro: form.bairro || null,
      complemento: form.complemento || null, observacoes: form.observacoes || null,
    };
    if (mode === "new") {
      const { error } = await supabase.from("fornecedores").insert(payload);
      if (error) { toast.error("Erro ao cadastrar fornecedor. Tente novamente."); return; }
      toast.success("Fornecedor criado!"); backToList(); await load();
    } else {
      payload.ativo = form.ativo;
      const { data: updated, error } = await supabase
        .from("fornecedores")
        .update(payload)
        .eq("id", selected.id)
        .select()
        .maybeSingle();
      if (error || !updated) { toast.error("Erro ao atualizar fornecedor. Tente novamente."); return; }
      toast.success("Fornecedor atualizado com sucesso");
      setSelected(updated); setMode("view"); await load();
    }
  }
  async function handleDelete() {
    if (!selected) return;
    const { error } = await supabase.from("fornecedores").delete().eq("id", selected.id);
    if (error) { toast.error("Erro ao excluir fornecedor"); return; }
    toast.success("Fornecedor excluído com sucesso");
    setDeleteOpen(false); backToList(); load();
  }
  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("fornecedores").update({ ativo: !ativo }).eq("id", id); load();
  }
  function handleCopy() {
    if (!selected) return;
    const docLabel = selected.tipo_pessoa === "PF" ? "CPF" : "CNPJ";
    const emails = selected.emails?.length ? selected.emails.join(", ") : (selected.email || "—");
    const phones = selected.telefones?.length ? selected.telefones.map((t: string) => formatPhone(t)).join(", ") : formatPhone(selected.telefone);
    let text = `Nome: ${selected.nome}`;
    if (selected.tipo_pessoa === "PJ") text += `\nRazão Social: ${selected.razao_social || "—"}`;
    text += `\n${docLabel}: ${formatCpfCnpj(selected.cpf_cnpj, selected.tipo_pessoa)}\nE-mails: ${emails}\nTelefones: ${phones}`;
    const addr = buildAddressString(selected); text += `\nEndereço: ${addr || "—"}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Dados do fornecedor copiados!");
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  /* ─── VIEW ─── */
  if (mode === "view" && selected) {
    return (
      <FormPageShell
        title="Detalhes do Fornecedor"
        subtitle="Visualize os dados do fornecedor"
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
        <FormSection
          icon={FileText}
          title="Dados Principais"
          action={
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Copiar Dados"}
            </Button>
          }
        >
          <DetailField label="Nome" value={selected.nome} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-muted-foreground">Tipo</span>
              <div className="mt-0.5"><Badge variant="outline">{selected.tipo_pessoa === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</Badge></div>
            </div>
            <DetailField label="Documento" value={formatCpfCnpj(selected.cpf_cnpj, selected.tipo_pessoa)} />
          </div>
          {selected.tipo_pessoa === "PJ" && <DetailField label="Razão Social" value={selected.razao_social} />}
          <DetailField label="Status" value={selected.ativo ? "Ativo" : "Inativo"} />
        </FormSection>

        <FormSection icon={Phone} title="Contatos">
          <div>
            <span className="text-xs text-muted-foreground">E-mails</span>
            {selected.emails?.length > 0 ? (
              <div className="space-y-0.5 mt-0.5">{selected.emails.map((e: string, i: number) => <p key={i} className="text-sm font-medium">{e}</p>)}</div>
            ) : selected.email ? <p className="text-sm font-medium mt-0.5">{selected.email}</p> : <p className="text-sm text-muted-foreground mt-0.5">—</p>}
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Telefones</span>
            {selected.telefones?.length > 0 ? (
              <div className="space-y-0.5 mt-0.5">{selected.telefones.map((t: string, i: number) => <p key={i} className="text-sm font-medium">{formatPhone(t)}</p>)}</div>
            ) : selected.telefone ? <p className="text-sm font-medium mt-0.5">{formatPhone(selected.telefone)}</p> : <p className="text-sm text-muted-foreground mt-0.5">—</p>}
          </div>
        </FormSection>

        <FormSection icon={MapPin} title="Endereço">
          <DetailField label="Endereço Completo" value={buildAddressString(selected)} />
        </FormSection>

        <FormSection icon={StickyNote} title="Observações">
          <DetailField label="Observações" value={selected.observacoes ? <span className="whitespace-pre-wrap">{selected.observacoes}</span> : null} />
        </FormSection>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir fornecedor</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir o fornecedor <strong>{selected.nome}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Excluir Fornecedor</AlertDialogAction>
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
        title={mode === "new" ? "Novo Fornecedor" : "Editar Fornecedor"}
        subtitle={mode === "new" ? "Preencha os dados do novo fornecedor" : "Atualize os dados do fornecedor"}
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
          <div className="grid grid-cols-[3fr_2fr] gap-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome fantasia ou nome completo" /></div>
            <div><Label>Tipo</Label>
              <Select value={form.tipo_pessoa} onValueChange={(v: "PF" | "PJ") => setForm({ ...form, tipo_pessoa: v, cpf_cnpj: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">Pessoa Física</SelectItem>
                  <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.tipo_pessoa === "PJ" ? (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Razão Social</Label><Input value={form.razao_social} onChange={e => setForm({ ...form, razao_social: e.target.value })} placeholder="Razão social" /></div>
              <div><Label>CNPJ</Label><Input value={form.cpf_cnpj} onChange={e => setForm({ ...form, cpf_cnpj: applyCpfCnpjMask(e.target.value, "PJ") })} placeholder="00.000.000/0001-00" /></div>
            </div>
          ) : (
            <div><Label>CPF</Label><Input value={form.cpf_cnpj} onChange={e => setForm({ ...form, cpf_cnpj: applyCpfCnpjMask(e.target.value, "PF") })} placeholder="000.000.000-00" /></div>
          )}
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

        <FormSection icon={StickyNote} title="Observações">
          <div><Label>Observações</Label><Textarea rows={4} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações gerais sobre o fornecedor" /></div>
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
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Novo Fornecedor</Button>
            <HelpTooltip content="Cadastre fornecedores para vinculá-los às Contas a Pagar. Facilitam o controle de quem você paga e permitem análises por fornecedor." />
          </div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Documento</TableHead><TableHead>E-mail</TableHead><TableHead>Telefone</TableHead><TableHead><div className="flex items-center gap-1">Ativo<HelpTooltip content="Fornecedores inativos não aparecem nos dropdowns ao criar movimentações, mas seus lançamentos históricos são preservados." /></div></TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id} className="group cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openView(i)}>
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
      </CardContent>
    </Card>
  );
}
