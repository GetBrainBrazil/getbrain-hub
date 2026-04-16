import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Eye, Trash2, FileText } from "lucide-react";
import { FormMode, FormPageShell, FormSection, DetailField } from "./shared";

type Form = { nome: string; descricao: string; ativo: boolean };
const empty: Form = { nome: "", descricao: "", ativo: true };

export default function CentrosCustoTab({ search }: { search: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [mode, setMode] = useState<FormMode>("list");
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<Form>(empty);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("centros_custo").select("*").order("nome"); setItems(data || []); }

  const filtered = items.filter(i => !search || i.nome.toLowerCase().includes(search.toLowerCase()));

  function openNew() { setSelected(null); setForm(empty); setMode("new"); }
  function openView(item: any) { setSelected(item); setMode("view"); }
  function startEdit() {
    if (!selected) return;
    setForm({ nome: selected.nome || "", descricao: selected.descricao || "", ativo: selected.ativo ?? true });
    setMode("edit");
  }
  function backToList() { setMode("list"); setSelected(null); }
  function cancelEdit() { if (mode === "new") backToList(); else setMode("view"); }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload: any = { nome: form.nome, descricao: form.descricao || null };
    if (mode === "new") {
      const { error } = await supabase.from("centros_custo").insert(payload);
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Centro de custo criado!"); backToList(); load();
    } else {
      payload.ativo = form.ativo;
      const { error } = await supabase.from("centros_custo").update(payload).eq("id", selected.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Centro de custo atualizado com sucesso");
      setSelected({ ...selected, ...payload }); setMode("view"); load();
    }
  }
  async function handleDelete() {
    if (!selected) return;
    const { error } = await supabase.from("centros_custo").delete().eq("id", selected.id);
    if (error) { toast.error("Erro ao excluir centro de custo"); return; }
    toast.success("Centro de custo excluído com sucesso");
    setDeleteOpen(false); backToList(); load();
  }
  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("centros_custo").update({ ativo: !ativo }).eq("id", id); load();
  }

  if (mode === "view" && selected) {
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
        <FormSection icon={FileText} title="Dados Principais">
          <DetailField label="Nome" value={selected.nome} />
          <DetailField label="Descrição" value={selected.descricao ? <span className="whitespace-pre-wrap">{selected.descricao}</span> : null} />
          <DetailField label="Status" value={selected.ativo ? "Ativo" : "Inativo"} />
        </FormSection>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir centro de custo</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir o centro de custo <strong>{selected.nome}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </FormPageShell>
    );
  }

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
        <FormSection icon={FileText} title="Dados Principais">
          <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Marketing" /></div>
          <div><Label>Descrição</Label><Textarea rows={4} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição do centro de custo" /></div>
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

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-end mb-4">
          <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Novo Centro</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Ativo</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id} className="group cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openView(i)}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{i.descricao || "—"}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}><Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} /></TableCell>
                <TableCell><Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum centro de custo encontrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
