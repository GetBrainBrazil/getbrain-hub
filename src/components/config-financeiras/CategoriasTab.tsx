import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ChevronRight, Check, X, Folder, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TIPOS_CATEGORIA, type TipoCategoria, type CategoriaRaw,
  buildCategoriasTree,
} from "@/lib/categorias-hierarchy";

type DeleteTarget =
  | { kind: "simple"; cat: CategoriaRaw }
  | { kind: "with-children"; cat: CategoriaRaw; childrenCount: number }
  | { kind: "in-use"; cat: CategoriaRaw; usageCount: number };

type NaturezaFilter = "todas" | "sintetica" | "analitica";

export default function CategoriasTab({ search }: { search: string }) {
  const [items, setItems] = useState<CategoriaRaw[]>([]);
  const [usageMap, setUsageMap] = useState<Map<string, number>>(new Map());
  const [tipoFilter, setTipoFilter] = useState<"todos" | TipoCategoria>("todos");
  const [statusFilter, setStatusFilter] = useState<"todas" | "ativas" | "inativas">("todas");
  const [naturezaFilter, setNaturezaFilter] = useState<NaturezaFilter>("todas");

  const [expandedTipos, setExpandedTipos] = useState<Set<string>>(new Set(TIPOS_CATEGORIA.map(t => t.key)));
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<"categoria" | "subcategoria">("categoria");
  const [createTipo, setCreateTipo] = useState<TipoCategoria>("despesas");
  const [createPaiId, setCreatePaiId] = useState<string>("");
  const [createNome, setCreateNome] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

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

  // Build tree (filtered by search/status). Tipo & natureza filters applied at render.
  const tree = useMemo(() => {
    let filtered = items;
    if (statusFilter === "ativas") filtered = filtered.filter(i => i.ativo);
    if (statusFilter === "inativas") filtered = filtered.filter(i => !i.ativo);

    const built = buildCategoriasTree(filtered);
    if (!search.trim()) return built;

    const q = search.trim().toLowerCase();
    return built
      .map(node => {
        const tipoMatch = node.config.label.toLowerCase().includes(q);
        const subs = node.subcategorias
          .map(sub => {
            const subMatch = sub.nome.toLowerCase().includes(q);
            const contas = sub.contas.filter(c => c.nome.toLowerCase().includes(q));
            if (tipoMatch || subMatch) return sub; // keep all contas
            if (contas.length > 0) return { ...sub, contas };
            return null;
          })
          .filter(Boolean) as typeof node.subcategorias;
        if (tipoMatch) return node;
        return { ...node, subcategorias: subs };
      })
      .filter(node => node.subcategorias.length > 0 || node.config.label.toLowerCase().includes(q));
  }, [items, search, statusFilter]);

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

  // ── CRUD ──
  async function saveInlineEdit() {
    if (!editingId) return;
    const nome = editingName.trim();
    if (!nome) { toast.error("Nome é obrigatório"); return; }
    const { error } = await supabase.from("categorias").update({ nome }).eq("id", editingId);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Categoria atualizada com sucesso");
    setEditingId(null); setEditingName("");
    loadAll();
  }

  function openCreateModal(opts?: { kind?: "categoria" | "subcategoria"; tipo?: TipoCategoria; paiId?: string }) {
    setCreateKind(opts?.kind ?? "categoria");
    setCreateTipo(opts?.tipo ?? "despesas");
    setCreatePaiId(opts?.paiId ?? "");
    setCreateNome("");
    setCreateOpen(true);
  }

  async function submitCreate() {
    const nome = createNome.trim();
    if (!nome) { toast.error("Nome é obrigatório"); return; }
    if (createKind === "subcategoria" && !createPaiId) {
      toast.error("Selecione a categoria pai"); return;
    }
    setCreateSaving(true);
    const payload = createKind === "categoria"
      ? { nome, tipo: createTipo, categoria_pai_id: null, ativo: true }
      : { nome, tipo: createTipo, categoria_pai_id: createPaiId, ativo: true };
    const { data, error } = await supabase.from("categorias").insert(payload).select("id").single();
    setCreateSaving(false);
    if (error) { toast.error("Erro ao criar"); return; }
    toast.success(createKind === "categoria" ? "Categoria criada com sucesso" : "Subcategoria criada com sucesso");
    if (createKind === "subcategoria") {
      setExpandedSubs(new Set([...expandedSubs, createPaiId]));
    } else {
      setExpandedTipos(new Set([...expandedTipos, createTipo]));
    }
    setCreateOpen(false);
    if (data?.id) {
      setHighlightId(data.id);
      setTimeout(() => setHighlightId(null), 1600);
    }
    loadAll();
  }

  async function toggleAtivo(cat: CategoriaRaw) {
    const { error } = await supabase.from("categorias").update({ ativo: !cat.ativo }).eq("id", cat.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    loadAll();
  }

  function requestDelete(cat: CategoriaRaw) {
    const usage = usageMap.get(cat.id) || 0;
    if (usage > 0) { setDeleteTarget({ kind: "in-use", cat, usageCount: usage }); return; }
    const children = items.filter(i => i.categoria_pai_id === cat.id);
    if (children.length > 0) {
      const childrenInUse = children.reduce((s, c) => s + (usageMap.get(c.id) || 0), 0);
      if (childrenInUse > 0) { setDeleteTarget({ kind: "in-use", cat, usageCount: childrenInUse }); return; }
      setDeleteTarget({ kind: "with-children", cat, childrenCount: children.length });
      return;
    }
    setDeleteTarget({ kind: "simple", cat });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "in-use") {
      const { error } = await supabase.from("categorias").update({ ativo: false }).eq("id", deleteTarget.cat.id);
      if (error) { toast.error("Erro ao desativar"); return; }
      toast.success("Categoria desativada");
    } else {
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




  // ── Render rows for the table ──
  type Row =
    | { kind: "tipo"; codigo: string; tipoIdx: number; label: string; tipo: TipoCategoria; hasChildren: boolean; open: boolean }
    | { kind: "sub"; codigo: string; cat: CategoriaRaw; tipo: TipoCategoria; hasChildren: boolean; open: boolean; isAnalitica: boolean }
    | { kind: "conta"; codigo: string; cat: CategoriaRaw; tipo: TipoCategoria }
    | { kind: "creating"; level: 2 | 3; codigo: string; tipo: TipoCategoria }
    | { kind: "add-placeholder"; level: 2 | 3; tipo: TipoCategoria; subId?: string };

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    tree.forEach((tipoNode, tIdx) => {
      // tipo filter
      if (tipoFilter !== "todos" && tipoNode.config.key !== tipoFilter) return;

      const tipoCodigo = String(tIdx + 1);
      const tipoOpen = expandedTipos.has(tipoNode.config.key);
      out.push({
        kind: "tipo",
        codigo: tipoCodigo,
        tipoIdx: tIdx + 1,
        label: tipoNode.config.label.charAt(0) + tipoNode.config.label.slice(1).toLowerCase(),
        tipo: tipoNode.config.key,
        hasChildren: tipoNode.subcategorias.length > 0,
        open: tipoOpen,
      });
      if (!tipoOpen) return;

      tipoNode.subcategorias.forEach((sub, sIdx) => {
        const subCodigo = `${tipoCodigo}.${String(sIdx + 1).padStart(2, "0")}`;
        const subOpen = expandedSubs.has(sub.id);
        const isAnalitica = sub.contas.length === 0;

        // natureza filter applies to sub & conta
        const subPasses =
          naturezaFilter === "todas" ||
          (naturezaFilter === "sintetica" && !isAnalitica) ||
          (naturezaFilter === "analitica" && isAnalitica);

        if (subPasses) {
          out.push({
            kind: "sub",
            codigo: subCodigo,
            cat: sub,
            tipo: tipoNode.config.key,
            hasChildren: !isAnalitica,
            open: subOpen,
            isAnalitica,
          });
        }

        if (subOpen) {
          sub.contas.forEach((conta, cIdx) => {
            // contas are always analitica
            if (naturezaFilter === "sintetica") return;
            out.push({
              kind: "conta",
              codigo: `${subCodigo}.${cIdx + 1}`,
              cat: conta,
              tipo: tipoNode.config.key,
            });
          });
          // fixed "+ Adicionar" placeholder for contas
          if (naturezaFilter !== "sintetica") {
            out.push({
              kind: "add-placeholder",
              level: 3,
              tipo: tipoNode.config.key,
              subId: sub.id,
            });
          }
        }
      });

      // fixed "+ Adicionar" placeholder for subcategorias
      if (naturezaFilter !== "analitica") {
        out.push({
          kind: "add-placeholder",
          level: 2,
          tipo: tipoNode.config.key,
        });
      }
    });
    return out;
  }, [tree, tipoFilter, naturezaFilter, expandedTipos, expandedSubs]);

  function tipoBadge(tipo: TipoCategoria) {
    const map: Record<TipoCategoria, { label: string; className: string }> = {
      receitas:       { label: "Receita",       className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
      despesas:       { label: "Despesa",       className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30" },
      impostos:       { label: "Impostos",      className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30" },
      retirada:       { label: "Retirada",      className: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30" },
      transferencias: { label: "Transferências",className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30" },
    };
    const m = map[tipo];
    return <Badge variant="outline" className={cn("font-medium text-[10.5px] px-1.5 py-0", m.className)}>{m.label}</Badge>;
  }

  function naturezaBadge(isAnalitica: boolean) {
    return (
      <Badge variant="outline" className="font-normal text-[10.5px] px-1.5 py-0 bg-muted text-muted-foreground border-border">
        {isAnalitica ? "Analítica" : "Sintética"}
      </Badge>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
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

          <Select value={naturezaFilter} onValueChange={(v: NaturezaFilter) => setNaturezaFilter(v)}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as naturezas</SelectItem>
              <SelectItem value="sintetica">Sintética</SelectItem>
              <SelectItem value="analitica">Analítica</SelectItem>
            </SelectContent>
          </Select>

        </div>


        {/* Hierarchical table */}
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[110px] text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9">Código</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9">Nome</TableHead>
                <TableHead className="w-[140px] text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9">Tipo</TableHead>
                <TableHead className="w-[110px] text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9">Natureza</TableHead>
                <TableHead className="w-[80px] text-[11px] uppercase tracking-wide text-muted-foreground font-medium h-9 text-right pr-4">Ativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                    Nenhuma categoria encontrada
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row, idx) => {
                if (row.kind === "tipo") {
                  return (
                    <TableRow key={`t-${row.tipo}`} className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                      <TableCell className="py-2.5 font-bold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleTipo(row.tipo)}
                            className={cn("h-5 w-5 flex items-center justify-center rounded hover:bg-muted/80", !row.hasChildren && "opacity-30 pointer-events-none")}
                            aria-label="Expandir"
                          >
                            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform text-muted-foreground", row.open && "rotate-90")} />
                          </button>
                          <span className="font-mono text-xs">{row.codigo}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="font-bold text-sm text-foreground">{row.label}</span>
                      </TableCell>
                      <TableCell className="py-2.5">{tipoBadge(row.tipo)}</TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className="font-normal text-[10.5px] px-1.5 py-0 bg-muted text-muted-foreground border-border">Sintética</Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-right pr-4">
                        <span className="text-xs text-muted-foreground">—</span>
                      </TableCell>
                    </TableRow>
                  );
                }

                if (row.kind === "sub") {
                  const isEditing = editingId === row.cat.id;
                  return (
                    <TableRow key={`s-${row.cat.id}`} className="border-b border-border/60 hover:bg-muted/30 group">
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => row.hasChildren && toggleSub(row.cat.id)}
                            className={cn("h-5 w-5 flex items-center justify-center rounded hover:bg-muted", !row.hasChildren && "opacity-0 pointer-events-none")}
                          >
                            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform text-muted-foreground", row.open && "rotate-90")} />
                          </button>
                          <span className="font-mono text-xs text-muted-foreground">{row.codigo}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center justify-between gap-2" style={{ paddingLeft: 24 }}>
                          {isEditing ? (
                            <InlineNameForm
                              value={editingName}
                              onChange={setEditingName}
                              onSave={saveInlineEdit}
                              onCancel={() => { setEditingId(null); setEditingName(""); }}
                              placeholder="Nome"
                              className="flex-1"
                            />
                          ) : (
                            <>
                              <span className={cn("text-sm font-semibold text-foreground", !row.cat.ativo && "text-muted-foreground line-through")}>
                                {row.cat.nome}
                              </span>
                              <RowActions
                                onEdit={() => { setEditingId(row.cat.id); setEditingName(row.cat.nome); }}
                                onDelete={() => requestDelete(row.cat)}
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">{tipoBadge(row.tipo)}</TableCell>
                      <TableCell className="py-2.5">{naturezaBadge(row.isAnalitica)}</TableCell>
                      <TableCell className="py-2.5 text-right pr-4">
                        <Switch checked={row.cat.ativo} onCheckedChange={() => toggleAtivo(row.cat)} />
                      </TableCell>
                    </TableRow>
                  );
                }

                if (row.kind === "conta") {
                  const isEditing = editingId === row.cat.id;
                  return (
                    <TableRow key={`c-${row.cat.id}`} className="border-b border-border/60 hover:bg-muted/30 group">
                      <TableCell className="py-2.5">
                        <span className="font-mono text-xs text-muted-foreground pl-[26px] block">{row.codigo}</span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center justify-between gap-2" style={{ paddingLeft: 48 }}>
                          {isEditing ? (
                            <InlineNameForm
                              value={editingName}
                              onChange={setEditingName}
                              onSave={saveInlineEdit}
                              onCancel={() => { setEditingId(null); setEditingName(""); }}
                              placeholder="Nome"
                              className="flex-1"
                            />
                          ) : (
                            <>
                              <span className={cn("text-sm text-foreground font-normal", !row.cat.ativo && "text-muted-foreground line-through")}>
                                {row.cat.nome}
                              </span>
                              <RowActions
                                onEdit={() => { setEditingId(row.cat.id); setEditingName(row.cat.nome); }}
                                onDelete={() => requestDelete(row.cat)}
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">{tipoBadge(row.tipo)}</TableCell>
                      <TableCell className="py-2.5">{naturezaBadge(true)}</TableCell>
                      <TableCell className="py-2.5 text-right pr-4">
                        <Switch checked={row.cat.ativo} onCheckedChange={() => toggleAtivo(row.cat)} />
                      </TableCell>
                    </TableRow>
                  );
                }

                // add-placeholder row (fixed "+ Adicionar" row)
                const isSub = row.level === 2;
                const paiSub = !isSub
                  ? items.find(i => i.id === row.subId)
                  : null;
                return (
                  <TableRow
                    key={`add-${row.tipo}-${row.subId ?? "root"}-${idx}`}
                    className="border-b border-border/60 opacity-60 hover:opacity-90 cursor-pointer transition-opacity"
                    onClick={() => {
                      if (isSub) {
                        openCreateModal({ kind: "categoria", tipo: row.tipo });
                      } else {
                        openCreateModal({
                          kind: "subcategoria",
                          tipo: row.tipo,
                          paiId: row.subId,
                        });
                      }
                    }}
                  >
                    <TableCell className="py-2">
                      <span className={cn("flex items-center justify-center w-5 h-5", !isSub && "ml-[26px]")}>
                        <Plus className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div style={{ paddingLeft: isSub ? 24 : 48 }}>
                        <span className="text-sm italic text-muted-foreground/70">
                          + Adicionar
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2"></TableCell>
                    <TableCell className="py-2"></TableCell>
                    <TableCell className="py-2 text-right pr-4"></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Delete dialog */}
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

      </CardContent>
    </Card>
  );
}

// (closing braces below replaced — keep only what's needed)

// ── Inline name form ──
function InlineNameForm({
  value, onChange, onSave, onCancel, placeholder, className,
}: {
  value: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void;
  placeholder: string; className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-sm flex-1 bg-transparent border-0 border-b border-border focus:border-primary focus:outline-none focus:ring-0 px-0 py-1 placeholder:text-muted-foreground/60"
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onSave(); }
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
      />
      <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" onClick={onSave}>
        <Check className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Row hover actions ──
function RowActions({
  onEdit, onDelete, onAddChild, showAdd,
}: {
  onEdit: () => void; onDelete: () => void; onAddChild?: () => void; showAdd?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      {showAdd && onAddChild && (
        <Button variant="ghost" size="sm" className="h-7 px-1.5 gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={onAddChild}>
          <Plus className="h-3.5 w-3.5" /> Conta
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
