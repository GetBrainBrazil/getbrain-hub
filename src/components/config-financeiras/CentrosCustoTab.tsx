import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Eye, Trash2, FileText, BarChart3, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormMode, FormPageShell, FormSection, DetailField } from "./shared";

type Form = {
  codigo: string;
  nome: string;
  responsavel: string;
  descricao: string;
  ativo: boolean;
};
const empty: Form = { codigo: "", nome: "", responsavel: "", descricao: "", ativo: true };

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

interface Resumo {
  count: number;
  despesas: number;
  receitas: number;
}

export default function CentrosCustoTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [usageMap, setUsageMap] = useState<Map<string, Resumo>>(new Map());
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativos" | "inativos">("todos");

  const [mode, setMode] = useState<FormMode>("list");
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<Form>(empty);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [{ data: ccs }, { data: movs }] = await Promise.all([
      supabase.from("centros_custo").select("*").order("nome"),
      supabase.from("movimentacoes").select("centro_custo_id, tipo, valor_realizado, valor_previsto"),
    ]);
    setItems(ccs || []);
    const map = new Map<string, Resumo>();
    (movs || []).forEach((m: any) => {
      if (!m.centro_custo_id) return;
      const cur = map.get(m.centro_custo_id) || { count: 0, despesas: 0, receitas: 0 };
      cur.count += 1;
      const v = Number(m.valor_realizado) || Number(m.valor_previsto) || 0;
      if (m.tipo === "despesa") cur.despesas += v;
      else if (m.tipo === "receita") cur.receitas += v;
      map.set(m.centro_custo_id, cur);
    });
    setUsageMap(map);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (statusFilter === "ativos" && !i.ativo) return false;
      if (statusFilter === "inativos" && i.ativo) return false;
      if (!q) return true;
      return (
        (i.nome || "").toLowerCase().includes(q) ||
        (i.codigo || "").toLowerCase().includes(q) ||
        (i.responsavel || "").toLowerCase().includes(q) ||
        (i.descricao || "").toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  function openNew() { setSelected(null); setForm(empty); setMode("new"); }
  function openView(item: any) { setSelected(item); setMode("view"); }
  function startEdit() {
    if (!selected) return;
    setForm({
      codigo: selected.codigo || "",
      nome: selected.nome || "",
      responsavel: selected.responsavel || "",
      descricao: selected.descricao || "",
      ativo: selected.ativo ?? true,
    });
    setMode("edit");
  }
  function backToList() { setMode("list"); setSelected(null); }
  function cancelEdit() { if (mode === "new") backToList(); else setMode("view"); }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.codigo.trim()) { toast.error("Código é obrigatório"); return; }
    const payload: any = {
      codigo: form.codigo.trim(),
      nome: form.nome.trim(),
      responsavel: form.responsavel.trim() || null,
      descricao: form.descricao.trim() || null,
    };
    if (mode === "new") {
      const { error } = await supabase.from("centros_custo").insert(payload);
      if (error) {
        if (error.message.includes("centros_custo_codigo_unique")) toast.error("Já existe um centro de custo com esse código");
        else toast.error("Erro ao cadastrar centro de custo. Tente novamente.");
        return;
      }
      toast.success("Centro de custo cadastrado com sucesso"); backToList(); await load();
    } else {
      payload.ativo = form.ativo;
      const { data: updated, error } = await supabase
        .from("centros_custo")
        .update(payload)
        .eq("id", selected.id)
        .select()
        .maybeSingle();
      if (error || !updated) {
        if (error?.message.includes("centros_custo_codigo_unique")) toast.error("Já existe um centro de custo com esse código");
        else toast.error("Erro ao atualizar centro de custo. Tente novamente.");
        return;
      }
      toast.success("Centro de custo atualizado com sucesso");
      setSelected(updated);
      setMode("view");
      await load();
    }
  }

  async function handleDelete() {
    if (!selected) return;
    const usage = usageMap.get(selected.id);
    if (usage && usage.count > 0) {
      // desativar
      const { error } = await supabase.from("centros_custo").update({ ativo: false }).eq("id", selected.id);
      if (error) { toast.error("Erro ao desativar"); return; }
      toast.success("Centro de custo desativado");
      setSelected({ ...selected, ativo: false });
      setDeleteOpen(false);
      load();
      return;
    }
    const { error } = await supabase.from("centros_custo").delete().eq("id", selected.id);
    if (error) { toast.error("Erro ao excluir centro de custo"); return; }
    toast.success("Centro de custo excluído com sucesso");
    setDeleteOpen(false); backToList(); load();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("centros_custo").update({ ativo: !ativo }).eq("id", id);
    load();
  }

  /* ─────────── VIEW ─────────── */
  if (mode === "view" && selected) {
    const resumo = usageMap.get(selected.id) || { count: 0, despesas: 0, receitas: 0 };
    const resultado = resumo.receitas - resumo.despesas;
    const inUse = resumo.count > 0;
    return (
      <FormPageShell
        title="Detalhes do Centro de Custo"
        subtitle="Visualize os dados do centro de custo"
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
        <FormSection icon={ClipboardList} title="Dados Principais">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DetailField label="Código" value={selected.codigo} />
            <DetailField label="Nome" value={selected.nome} className="sm:col-span-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailField label="Responsável" value={selected.responsavel || "Não definido"} />
            <DetailField label="Status" value={selected.ativo ? "Ativo" : "Inativo"} />
          </div>
        </FormSection>

        <FormSection icon={FileText} title="Detalhes">
          <DetailField
            label="Descrição"
            value={selected.descricao
              ? <span className="whitespace-pre-wrap">{selected.descricao}</span>
              : "Sem descrição"}
          />
        </FormSection>

        <FormSection icon={BarChart3} title="Resumo Financeiro">
          {resumo.count === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento vinculado a este centro de custo</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <DetailField label="Total de Lançamentos" value={resumo.count} />
              <DetailField label="Total de Despesas" value={<span className="text-destructive">{fmtBRL(resumo.despesas)}</span>} />
              <DetailField label="Total de Receitas" value={<span className="text-emerald-600 dark:text-emerald-400">{fmtBRL(resumo.receitas)}</span>} />
              <DetailField
                label="Resultado"
                value={
                  <span className={cn("font-semibold", resultado >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                    {fmtBRL(resultado)}
                  </span>
                }
              />
            </div>
          )}
        </FormSection>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{inUse ? "Centro de custo em uso" : "Excluir centro de custo"}</AlertDialogTitle>
              <AlertDialogDescription>
                {inUse ? (
                  <>Este centro de custo está vinculado a <strong>{resumo.count}</strong> lançamento(s). Não é possível excluir centros de custo em uso. Você pode desativá-lo.</>
                ) : (
                  <>Tem certeza que deseja excluir o centro de custo <strong>{selected.nome}</strong>? Esta ação não pode ser desfeita.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className={cn(!inUse && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                onClick={handleDelete}
              >
                {inUse ? "Desativar" : "Excluir Centro"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </FormPageShell>
    );
  }

  /* ─────────── EDIT / NEW ─────────── */
  if (mode === "edit" || mode === "new") {
    return (
      <FormPageShell
        title={mode === "new" ? "Novo Centro de Custo" : "Editar Centro de Custo"}
        subtitle={mode === "new" ? "Preencha os dados do novo centro de custo" : "Atualize os dados do centro de custo"}
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
        <FormSection icon={ClipboardList} title="Dados Principais">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 sm:col-span-4">
              <Label>Código *</Label>
              <Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Ex: CC001" />
            </div>
            <div className="col-span-12 sm:col-span-8">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Administrativo" />
            </div>
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome do responsável" />
          </div>
        </FormSection>

        <FormSection icon={FileText} title="Detalhes">
          <div>
            <Label>Descrição</Label>
            <Textarea rows={4} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição do centro de custo" />
          </div>
          {mode === "edit" && (
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} />
              <Label>{form.ativo ? "Ativo" : "Inativo"}</Label>
            </div>
          )}
        </FormSection>
      </FormPageShell>
    );
  }

  /* ─────────── LIST ─────────── */
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="ativos">Ativos</SelectItem>
              <SelectItem value="inativos">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button size="sm" className="gap-1 h-9" onClick={openNew}>
              <Plus className="h-4 w-4" /> Novo Centro
            </Button>
          </div>
        </div>

        <TooltipProvider delayDuration={200}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-20">Ativo</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(i => (
                <TableRow
                  key={i.id}
                  className="group cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => openView(i)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">{i.codigo || "—"}</TableCell>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{i.responsavel || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">
                    {i.descricao ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate">{i.descricao}</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md whitespace-pre-wrap">{i.descricao}</TooltipContent>
                      </Tooltip>
                    ) : "—"}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} />
                  </TableCell>
                  <TableCell>
                    <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum centro de custo encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
