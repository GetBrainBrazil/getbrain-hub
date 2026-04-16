import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ChevronRight, Folder, Tag, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TIPOS_CATEGORIA, type TipoCategoria, type CategoriaRaw,
  buildCategoriasTree, getTipoConfig,
} from "@/lib/categorias-hierarchy";

type DeleteTarget =
  | { kind: "simple"; cat: CategoriaRaw }
  | { kind: "with-children"; cat: CategoriaRaw; childrenCount: number }
  | { kind: "in-use"; cat: CategoriaRaw; usageCount: number };

export default function CategoriasTab({ search }: { search: string }) {
  const [items, setItems] = useState<CategoriaRaw[]>([]);
  const [usageMap, setUsageMap] = useState<Map<string, number>>(new Map());
  const [tipoFilter, setTipoFilter] = useState<"todos" | TipoCategoria>("todos");
  const [statusFilter, setStatusFilter] = useState<"todas" | "ativas" | "inativas">("todas");

  // expand state per type and per subcategory
  const [expandedTipos, setExpandedTipos] = useState<Set<string>>(new Set(TIPOS_CATEGORIA.map(t => t.key)));
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());

  // inline edit / create state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [creatingSubFor, setCreatingSubFor] = useState<TipoCategoria | null>(null);
  const [creatingContaFor, setCreatingContaFor] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  // delete dialog
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // top-level "+ Nova" modal
  const [novaModal, setNovaModal] = useState<null | "sub" | "conta">(null);
  const [novaForm, setNovaForm] = useState<{ tipo: TipoCategoria; pai_id: string; nome: string }>({
    tipo: "despesas", pai_id: "", nome: "",
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [{ data: cats }, { data: usage }] = await Promise.all([
      supabase.from("categorias").select("*"),
      supabase.from("movimentacoes").select("categoria_id"),
    ]);
    setItems((cats as CategoriaRaw[]) || []);
    const m = new Map<string, number>();
    (usage || []).forEach((r: any) => {
      if (!r.categoria_id) return;
      m.set(r.categoria_id, (m.get(r.categoria_id) || 0) + 1);
    });
    setUsageMap(m);
  }

  // ---- Tree (filtered by search/filters, auto-expand on search) ----
  const filteredTree = useMemo(() => {
    let filtered = items;
    if (statusFilter === "ativas") filtered = filtered.filter(i => i.ativo);
    if (statusFilter === "inativas") filtered = filtered.filter(i => !i.ativo);

    const tree = buildCategoriasTree(filtered);
    if (!search.trim() && tipoFilter === "todos") return tree;

    const q = search.trim().toLowerCase();
    const autoExpandTipos = new Set<string>();
    const autoExpandSubs = new Set<string>();

    const result = tree
      .filter(node => tipoFilter === "todos" || node.config.key === tipoFilter)
      .map(node => {
        const tipoMatch = q ? node.config.label.toLowerCase().includes(q) : true;
        const subs = node.subcategorias
          .map(sub => {
            const subMatch = q ? sub.nome.toLowerCase().includes(q) : true;
            const contas = q ? sub.contas.filter(c => c.nome.toLowerCase().includes(q)) : sub.contas;
            const keep = tipoMatch || subMatch || contas.length > 0;
            if (keep && (subMatch || contas.length > 0)) {
              autoExpandTipos.add(node.config.key);
              if (contas.length > 0) autoExpandSubs.add(sub.id);
            }
            return keep ? { ...sub, contas: q && !subMatch ? contas : sub.contas } : null;
          })
          .filter(Boolean) as typeof node.subcategorias;
        return { ...node, subcategorias: subs };
      })
      .filter(node => node.subcategorias.length > 0 || (q && node.config.label.toLowerCase().includes(q)));

    // apply auto-expand once
    if (q) {
      autoExpandTipos.forEach(k => expandedTipos.add(k));
      autoExpandSubs.forEach(k => expandedSubs.add(k));
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, tipoFilter, statusFilter]);

  // ---- helpers ----
  function toggleTipo(key: string) {
    const next = new Set(expandedTipos);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedTipos(next);
  }
  function toggleSub(id: string) {
    const next = new Set(expandedSubs);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedSubs(next);
  }

  // ---- CRUD ----
  async function saveInlineEdit() {
    if (!editingId) return;
    const nome = editingName.trim();
    if (!nome) { toast.error("Nome é obrigatório"); return; }
    const { error } = await supabase.from("categorias").update({ nome }).eq("id", editingId);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Atualizado!");
    setEditingId(null); setEditingName("");
    loadAll();
  }

  async function saveNewSub() {
    if (!creatingSubFor) return;
    const nome = newName.trim();
    if (!nome) { toast.error("Nome é obrigatório"); return; }
    const { error } = await supabase.from("categorias").insert({
      nome, tipo: creatingSubFor, categoria_pai_id: null, ativo: true,
    });
    if (error) { toast.error("Erro ao criar"); return; }
    toast.success("Subcategoria criada!");
    setCreatingSubFor(null); setNewName("");
    loadAll();
  }

  async function saveNewConta() {
    if (!creatingContaFor) return;
    const pai = items.find(i => i.id === creatingContaFor);
    if (!pai) return;
    const nome = newName.trim();
    if (!nome) { toast.error("Nome é obrigatório"); return; }
    const { error } = await supabase.from("categorias").insert({
      nome, tipo: pai.tipo, categoria_pai_id: pai.id, ativo: true,
    });
    if (error) { toast.error("Erro ao criar"); return; }
    toast.success("Conta criada!");
    setCreatingContaFor(null); setNewName("");
    setExpandedSubs(new Set([...expandedSubs, pai.id]));
    loadAll();
  }

  async function toggleAtivo(cat: CategoriaRaw) {
    const { error } = await supabase.from("categorias").update({ ativo: !cat.ativo }).eq("id", cat.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    loadAll();
  }

  function requestDelete(cat: CategoriaRaw) {
    const usage = usageMap.get(cat.id) || 0;
    if (usage > 0) {
      setDeleteTarget({ kind: "in-use", cat, usageCount: usage });
      return;
    }
    const children = items.filter(i => i.categoria_pai_id === cat.id);
    if (children.length > 0) {
      // check if any child is in use
      const childrenInUse = children.reduce((s, c) => s + (usageMap.get(c.id) || 0), 0);
      if (childrenInUse > 0) {
        setDeleteTarget({ kind: "in-use", cat, usageCount: childrenInUse });
        return;
      }
      setDeleteTarget({ kind: "with-children", cat, childrenCount: children.length });
      return;
    }
    setDeleteTarget({ kind: "simple", cat });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "in-use") {
      // desativar
      const { error } = await supabase.from("categorias").update({ ativo: false }).eq("id", deleteTarget.cat.id);
      if (error) { toast.error("Erro ao desativar"); return; }
      toast.success("Categoria desativada");
    } else {
      // se tiver filhos, deletar filhos primeiro
      if (deleteTarget.kind === "with-children") {
        await supabase.from("categorias").delete().eq("categoria_pai_id", deleteTarget.cat.id);
      }
      const { error } = await supabase.from("categorias").delete().eq("id", deleteTarget.cat.id);
      if (error) { toast.error("Erro ao excluir"); return; }
      toast.success("Excluído com sucesso");
    }
    setDeleteTarget(null);
    loadAll();
  }

  // ---- Modal "+ Nova" no topo ----
  async function saveNovaModal() {
    const nome = novaForm.nome.trim();
    if (!nome) { toast.error("Nome é obrigatório"); return; }
    if (novaModal === "conta" && !novaForm.pai_id) { toast.error("Selecione a subcategoria"); return; }
    const payload = novaModal === "sub"
      ? { nome, tipo: novaForm.tipo, categoria_pai_id: null, ativo: true }
      : { nome, tipo: novaForm.tipo, categoria_pai_id: novaForm.pai_id, ativo: true };
    const { error } = await supabase.from("categorias").insert(payload);
    if (error) { toast.error("Erro ao criar"); return; }
    toast.success(novaModal === "sub" ? "Subcategoria criada!" : "Conta criada!");
    setExpandedTipos(new Set([...expandedTipos, novaForm.tipo]));
    if (novaModal === "conta") setExpandedSubs(new Set([...expandedSubs, novaForm.pai_id]));
    setNovaModal(null);
    setNovaForm({ tipo: "despesas", pai_id: "", nome: "" });
    loadAll();
  }

  const subsForNovaConta = useMemo(
    () => items.filter(i => !i.categoria_pai_id && i.tipo === novaForm.tipo).sort((a, b) => a.nome.localeCompare(b.nome)),
    [items, novaForm.tipo],
  );

  return (
    <Card>
      <CardContent className="pt-6">
        {/* ── Top bar: filters + +Nova ── */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <Select value={tipoFilter} onValueChange={(v: any) => setTipoFilter(v)}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TIPOS_CATEGORIA.map(t => (
                <SelectItem key={t.key} value={t.key}>{t.label.charAt(0) + t.label.slice(1).toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="ativas">Ativas</SelectItem>
              <SelectItem value="inativas">Inativas</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1 h-9"><Plus className="h-4 w-4" /> Nova</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setNovaForm({ tipo: "despesas", pai_id: "", nome: "" }); setNovaModal("sub"); }}>
                  <Folder className="h-4 w-4 mr-2" /> Nova Subcategoria
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setNovaForm({ tipo: "despesas", pai_id: "", nome: "" }); setNovaModal("conta"); }}>
                  <Tag className="h-4 w-4 mr-2" /> Nova Conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Tree ── */}
        <div className="space-y-3">
          {filteredTree.map(tipoNode => {
            const open = expandedTipos.has(tipoNode.config.key);
            const subCount = tipoNode.subcategorias.length;
            return (
              <div key={tipoNode.config.key} className={cn("rounded-lg border overflow-hidden", "border-l-4", tipoNode.config.borderClass)}>
                {/* Tipo header */}
                <div className={cn("flex items-center gap-2 px-3 py-2.5 group", tipoNode.config.bgClass)}>
                  <button onClick={() => toggleTipo(tipoNode.config.key)} className="flex items-center gap-2 flex-1 text-left">
                    <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90", tipoNode.config.textClass)} />
                    <span className={cn("font-bold text-xs tracking-wider", tipoNode.config.textClass)}>
                      {tipoNode.config.label} ({subCount})
                    </span>
                  </button>
                  {creatingSubFor === tipoNode.config.key ? (
                    <InlineNameForm
                      placeholder="Nome da subcategoria"
                      value={newName}
                      onChange={setNewName}
                      onSave={saveNewSub}
                      onCancel={() => { setCreatingSubFor(null); setNewName(""); }}
                    />
                  ) : (
                    <Button
                      variant="ghost" size="sm"
                      className={cn("h-7 gap-1 text-xs opacity-0 group-hover:opacity-100 focus:opacity-100", tipoNode.config.textClass)}
                      onClick={() => { setCreatingSubFor(tipoNode.config.key); setNewName(""); setExpandedTipos(new Set([...expandedTipos, tipoNode.config.key])); }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Subcategoria
                    </Button>
                  )}
                </div>

                {/* Subcategorias */}
                {open && (
                  <div className="bg-card">
                    {tipoNode.subcategorias.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma subcategoria. Clique em "+ Subcategoria" acima.</div>
                    )}
                    {tipoNode.subcategorias.map(sub => {
                      const subOpen = expandedSubs.has(sub.id);
                      const isEditing = editingId === sub.id;
                      const usage = usageMap.get(sub.id) || 0;
                      return (
                        <div key={sub.id}>
                          {/* Linha da subcategoria */}
                          <div className="group flex items-center gap-2 pl-8 pr-3 py-2 border-t hover:bg-muted/40 transition-colors border-l-2 border-l-dashed border-l-border ml-4">
                            <button
                              onClick={() => sub.contas.length > 0 && toggleSub(sub.id)}
                              className={cn("h-5 w-5 flex items-center justify-center rounded hover:bg-muted", sub.contas.length === 0 && "opacity-0 pointer-events-none")}
                            >
                              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform text-muted-foreground", subOpen && "rotate-90")} />
                            </button>
                            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                            {isEditing ? (
                              <InlineNameForm
                                placeholder="Nome"
                                value={editingName}
                                onChange={setEditingName}
                                onSave={saveInlineEdit}
                                onCancel={() => { setEditingId(null); setEditingName(""); }}
                                className="flex-1"
                              />
                            ) : (
                              <>
                                <span className={cn("text-sm flex-1", !sub.ativo && "text-muted-foreground line-through")}>
                                  {sub.nome}
                                  {sub.contas.length > 0 && <span className="text-muted-foreground ml-1.5 text-xs">({sub.contas.length})</span>}
                                </span>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                  {creatingContaFor === sub.id ? null : (
                                    <Button variant="ghost" size="sm" className="h-7 px-1.5 gap-1 text-xs" onClick={() => { setCreatingContaFor(sub.id); setNewName(""); }}>
                                      <Plus className="h-3.5 w-3.5" /> Conta
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(sub.id); setEditingName(sub.nome); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => requestDelete(sub)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <Switch checked={sub.ativo} onCheckedChange={() => toggleAtivo(sub)} className="ml-1" />
                              </>
                            )}
                          </div>

                          {/* Form inline para criar conta dentro desta sub */}
                          {creatingContaFor === sub.id && (
                            <div className="flex items-center gap-2 pl-16 pr-3 py-2 border-t bg-muted/20">
                              <Tag className="h-4 w-4 text-muted-foreground" />
                              <InlineNameForm
                                placeholder="Nome da conta"
                                value={newName}
                                onChange={setNewName}
                                onSave={saveNewConta}
                                onCancel={() => { setCreatingContaFor(null); setNewName(""); }}
                                className="flex-1"
                              />
                            </div>
                          )}

                          {/* Contas (nível 3) */}
                          {subOpen && sub.contas.map(conta => {
                            const contaEditing = editingId === conta.id;
                            return (
                              <div key={conta.id} className="group flex items-center gap-2 pl-16 pr-3 py-2 border-t hover:bg-muted/40 transition-colors border-l-2 border-l-dashed border-l-border ml-4">
                                <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {contaEditing ? (
                                  <InlineNameForm
                                    placeholder="Nome"
                                    value={editingName}
                                    onChange={setEditingName}
                                    onSave={saveInlineEdit}
                                    onCancel={() => { setEditingId(null); setEditingName(""); }}
                                    className="flex-1"
                                  />
                                ) : (
                                  <>
                                    <span className={cn("text-sm flex-1", !conta.ativo && "text-muted-foreground line-through")}>{conta.nome}</span>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(conta.id); setEditingName(conta.nome); }}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => requestDelete(conta)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                    <Switch checked={conta.ativo} onCheckedChange={() => toggleAtivo(conta)} className="ml-1" />
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {filteredTree.length === 0 && (
            <div className="text-center text-muted-foreground py-12 text-sm">Nenhuma categoria encontrada</div>
          )}
        </div>

        {/* ── Delete Dialog ── */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteTarget?.kind === "in-use" ? "Categoria em uso" : `Excluir "${deleteTarget?.cat.nome}"?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.kind === "in-use" && (
                  <>Esta categoria está vinculada a <strong>{deleteTarget.usageCount}</strong> lançamento(s). Não é possível excluir categorias em uso. Você pode desativá-la.</>
                )}
                {deleteTarget?.kind === "with-children" && (
                  <>A subcategoria <strong>"{deleteTarget.cat.nome}"</strong> possui <strong>{deleteTarget.childrenCount}</strong> conta(s). Deseja excluir a subcategoria e todas as suas contas? Esta ação não pode ser desfeita.</>
                )}
                {deleteTarget?.kind === "simple" && <>Esta ação não pode ser desfeita.</>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className={cn(deleteTarget?.kind !== "in-use" && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                onClick={confirmDelete}
              >
                {deleteTarget?.kind === "in-use" ? "Desativar" :
                 deleteTarget?.kind === "with-children" ? "Excluir Tudo" : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── "+ Nova" modal ── */}
        <Dialog open={!!novaModal} onOpenChange={(o) => !o && setNovaModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{novaModal === "sub" ? "Nova Subcategoria" : "Nova Conta"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Tipo *</Label>
                <Select value={novaForm.tipo} onValueChange={(v: TipoCategoria) => setNovaForm({ ...novaForm, tipo: v, pai_id: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_CATEGORIA.map(t => (
                      <SelectItem key={t.key} value={t.key}>{t.label.charAt(0) + t.label.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {novaModal === "conta" && (
                <div>
                  <Label className="text-xs">Subcategoria *</Label>
                  <Select value={novaForm.pai_id} onValueChange={(v) => setNovaForm({ ...novaForm, pai_id: v })}>
                    <SelectTrigger><SelectValue placeholder={subsForNovaConta.length ? "Selecione..." : "Nenhuma subcategoria neste tipo"} /></SelectTrigger>
                    <SelectContent>
                      {subsForNovaConta.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs">Nome *</Label>
                <Input value={novaForm.nome} onChange={e => setNovaForm({ ...novaForm, nome: e.target.value })} placeholder={novaModal === "sub" ? "Ex: Marketing" : "Ex: Mídias Sociais"} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNovaModal(null)}>Cancelar</Button>
              <Button onClick={saveNovaModal}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ──────────── Inline name form (small) ────────────
function InlineNameForm({
  value, onChange, onSave, onCancel, placeholder, className,
}: {
  value: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void;
  placeholder: string; className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onSave(); }
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
      />
      <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" onClick={onSave}>
        <Check className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
