import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getHierarchicalOptions } from "@/lib/categorias-hierarchy";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ImportExtratoWizard } from "@/components/ImportExtratoWizard";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  ArrowLeft,
  FileText,
  Building2,
  Pencil,
  Upload,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function ExtratoMovimentacaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    descricao: "",
    categoria_id: "",
    cliente_id: "",
    fornecedor_id: "",
    centro_custo_id: "",
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDesfazer, setConfirmDesfazer] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Movimentação completa
  const { data: mov, isLoading } = useQuery({
    queryKey: ["extrato_mov_detalhe", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select(
          "id, descricao, tipo, valor_realizado, valor_previsto, data_pagamento, data_vencimento, status, conciliado, observacoes, categoria_id, cliente_id, fornecedor_id, centro_custo_id, conta_bancaria_id, categorias(nome), clientes(nome), fornecedores(nome), centros_custo(nome)"
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Transação de extrato vinculada
  const { data: extrato } = useQuery({
    queryKey: ["extrato_mov_transacao", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("extrato_transacoes")
        .select("*, extrato_importacoes(nome_arquivo, created_at)")
        .eq("movimentacao_id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: contas = [] } = useQuery({
    queryKey: ["contas_bancarias_lookup"],
    queryFn: async () => {
      const { data } = await supabase.from("contas_bancarias").select("id, nome").eq("ativo", true);
      return data || [];
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias_lookup_detalhe"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categorias")
        .select("id, nome, tipo, categoria_pai_id, ativo")
        .eq("ativo", true)
        .order("nome");
      return data || [];
    },
  });
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes_lookup_detalhe"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome");
      return data || [];
    },
  });
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores_lookup_detalhe"],
    queryFn: async () => {
      const { data } = await supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome");
      return data || [];
    },
  });
  const { data: centrosCusto = [] } = useQuery({
    queryKey: ["centros_custo_lookup_detalhe"],
    queryFn: async () => {
      const { data } = await supabase.from("centros_custo").select("id, nome").eq("ativo", true).order("nome");
      return data || [];
    },
  });

  const valor = useMemo(() => {
    if (!mov) return 0;
    return mov.valor_realizado ?? mov.valor_previsto ?? 0;
  }, [mov]);

  const contaNome = useMemo(() => {
    if (!extrato) return "—";
    return contas.find((c: any) => c.id === extrato.conta_bancaria_id)?.nome ?? "—";
  }, [extrato, contas]);

  const isManualConciliation = !!mov?.conciliado && !extrato;

  function startEdit() {
    if (!mov) return;
    setEditForm({
      descricao: mov.descricao || "",
      categoria_id: mov.categoria_id || "",
      cliente_id: mov.cliente_id || "",
      fornecedor_id: mov.fornecedor_id || "",
      centro_custo_id: mov.centro_custo_id || "",
      observacoes: mov.observacoes || "",
    });
    setEditMode(true);
  }

  async function handleSaveEdit() {
    if (!mov) return;
    setSaving(true);
    const { error } = await supabase
      .from("movimentacoes")
      .update({
        descricao: editForm.descricao,
        categoria_id: editForm.categoria_id || null,
        cliente_id: editForm.cliente_id || null,
        fornecedor_id: editForm.fornecedor_id || null,
        centro_custo_id: editForm.centro_custo_id || null,
        observacoes: editForm.observacoes || null,
      })
      .eq("id", mov.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar alterações.");
      return;
    }
    toast.success("Lançamento atualizado com sucesso");
    setEditMode(false);
    queryClient.invalidateQueries({ queryKey: ["extrato_mov_detalhe", id] });
    queryClient.invalidateQueries({ queryKey: ["extrato_movimentacoes"] });
  }

  async function handleDesfazerConciliacao() {
    if (!mov) return;
    await supabase.from("movimentacoes").update({ conciliado: false }).eq("id", mov.id);
    if (extrato) {
      await supabase
        .from("extrato_transacoes")
        .update({ conciliado: false, status_match: "sem_match", movimentacao_id: null })
        .eq("id", (extrato as any).id);
    }
    queryClient.invalidateQueries({ queryKey: ["extrato_mov_detalhe", id] });
    queryClient.invalidateQueries({ queryKey: ["extrato_movimentacoes"] });
    queryClient.invalidateQueries({ queryKey: ["extrato_transacoes"] });
    toast.success("Conciliação desfeita.");
    setConfirmDesfazer(false);
    navigate("/financeiro/extratos");
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!mov) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/financeiro/extratos")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <p className="text-muted-foreground">Movimentação não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto animate-fade-slide">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/financeiro/extratos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-heading">Detalhes da Movimentação</h1>
          <p className="text-sm text-muted-foreground">
            Visualize os dados do lançamento e da transação bancária
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-8">
          {/* SEÇÃO 1 — Lançamento no sistema */}
          <section>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-accent" />
              <h2 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                Lançamento no Sistema
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Controle interno — pode ser editado</p>
            <Separator className="mb-5" />

            {editMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FieldLabel>Descrição</FieldLabel>
                  <Input
                    value={editForm.descricao}
                    onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))}
                  />
                </div>
                <ReadOnlyField label="Tipo">
                  <Badge
                    className={
                      mov.tipo === "receita"
                        ? "bg-success/15 text-success border-success/30"
                        : "bg-destructive/15 text-destructive border-destructive/30"
                    }
                  >
                    {mov.tipo === "receita" ? "Entrada" : "Saída"}
                  </Badge>
                </ReadOnlyField>
                <ReadOnlyField label="Valor" value={formatCurrency(valor)} />
                <ReadOnlyField
                  label="Data de Vencimento"
                  value={mov.data_vencimento ? formatDate(mov.data_vencimento) : "—"}
                />
                <ReadOnlyField
                  label="Data de Pagamento"
                  value={mov.data_pagamento ? formatDate(mov.data_pagamento) : "—"}
                />
                <div>
                  <FieldLabel>Categoria</FieldLabel>
                  <Select
                    value={editForm.categoria_id || "__none__"}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, categoria_id: v === "__none__" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      {getHierarchicalOptions(categorias as any).map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          <span className="flex items-center gap-1.5">
                            {o.level === 3 && <span className="text-muted-foreground text-xs">└─</span>}
                            {o.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {mov.tipo === "receita" && (
                  <div>
                    <FieldLabel>Cliente</FieldLabel>
                    <Select
                      value={editForm.cliente_id || "__none__"}
                      onValueChange={(v) =>
                        setEditForm((f) => ({ ...f, cliente_id: v === "__none__" ? "" : v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {clientes.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {mov.tipo === "despesa" && (
                  <div>
                    <FieldLabel>Fornecedor</FieldLabel>
                    <Select
                      value={editForm.fornecedor_id || "__none__"}
                      onValueChange={(v) =>
                        setEditForm((f) => ({ ...f, fornecedor_id: v === "__none__" ? "" : v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {fornecedores.map((f: any) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <FieldLabel>Centro de Custo</FieldLabel>
                  <Select
                    value={editForm.centro_custo_id || "__none__"}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, centro_custo_id: v === "__none__" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {centrosCusto.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Observações</FieldLabel>
                  <Textarea
                    rows={3}
                    value={editForm.observacoes}
                    onChange={(e) => setEditForm((f) => ({ ...f, observacoes: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <ReadOnlyField label="Descrição" value={mov.descricao} />
                <ReadOnlyField label="Tipo">
                  <Badge
                    className={
                      mov.tipo === "receita"
                        ? "bg-success/15 text-success border-success/30"
                        : "bg-destructive/15 text-destructive border-destructive/30"
                    }
                  >
                    {mov.tipo === "receita" ? "Entrada" : "Saída"}
                  </Badge>
                </ReadOnlyField>
                <ReadOnlyField label="Valor" value={formatCurrency(valor)} mono />
                <ReadOnlyField
                  label="Data de Vencimento"
                  value={mov.data_vencimento ? formatDate(mov.data_vencimento) : "—"}
                />
                <ReadOnlyField
                  label="Data de Pagamento"
                  value={mov.data_pagamento ? formatDate(mov.data_pagamento) : "—"}
                />
                <ReadOnlyField label="Categoria" value={(mov as any).categorias?.nome ?? "—"} />
                <ReadOnlyField label="Cliente" value={(mov as any).clientes?.nome ?? "—"} />
                <ReadOnlyField label="Fornecedor" value={(mov as any).fornecedores?.nome ?? "—"} />
                <ReadOnlyField
                  label="Centro de Custo"
                  value={(mov as any).centros_custo?.nome ?? "—"}
                />
                {mov.observacoes && (
                  <div className="sm:col-span-2">
                    <ReadOnlyField label="Observações" value={mov.observacoes} />
                  </div>
                )}
              </div>
            )}

            <div className="mt-5">
              {editMode ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="gap-2" onClick={startEdit}>
                  <Pencil className="h-3.5 w-3.5" /> Editar Lançamento
                </Button>
              )}
            </div>
          </section>

          <Separator />

          {/* SEÇÃO 2 — Transação no Extrato */}
          <section className="rounded-lg bg-muted/40 border border-border/60 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-accent" />
              <h2 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                Transação no Extrato
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Dado oficial do banco — não editável</p>

            {extrato ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <ReadOnlyField
                  label="Data de Processamento"
                  value={formatDate(extrato.data_transacao)}
                />
                <ReadOnlyField label="Descrição Original" value={extrato.descricao_banco} />
                <ReadOnlyField label="Valor" value={formatCurrency(Math.abs(extrato.valor))} mono />
                <ReadOnlyField
                  label="Identificador (FITID)"
                  value={extrato.id?.slice(0, 12) ?? "—"}
                  mono
                />
                <ReadOnlyField label="Conta Bancária" value={contaNome} />
                {extrato.extrato_importacoes && (
                  <ReadOnlyField label="Arquivo de Origem">
                    <span className="text-sm text-accent">
                      {(extrato.extrato_importacoes as any).nome_arquivo}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      (importado em {formatDate((extrato.extrato_importacoes as any).created_at)})
                    </span>
                  </ReadOnlyField>
                )}
              </div>
            ) : isManualConciliation ? (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                <p className="text-sm text-warning font-medium">
                  Conciliação manual — sem vínculo com extrato importado
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                  <p className="text-sm text-warning">
                    Esta movimentação ainda não foi conciliada com um extrato bancário. Importe o
                    extrato correspondente para confirmar a transação.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload className="h-3.5 w-3.5" /> Importar Extrato
                </Button>
              </div>
            )}
          </section>

          {/* Footer */}
          <div className="border-t pt-5 flex items-center justify-between">
            <div>
              {mov.conciliado && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
                  onClick={() => setConfirmDesfazer(true)}
                >
                  <X className="h-3.5 w-3.5" /> Desfazer Conciliação
                </Button>
              )}
            </div>
            <Button variant="secondary" onClick={() => navigate("/financeiro/extratos")}>
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>

      <ImportExtratoWizard open={importOpen} onOpenChange={setImportOpen} contas={contas as any} />

      <AlertDialog open={confirmDesfazer} onOpenChange={setConfirmDesfazer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer conciliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desfazer a conciliação desta movimentação? O lançamento
              continuará registrado no sistema, mas voltará ao status de "Pendente de Conciliação".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDesfazerConciliacao}
            >
              Desfazer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mb-1.5">{children}</p>;
}

function ReadOnlyField({
  label,
  value,
  children,
  mono,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {children ? (
        <div className="text-sm font-medium flex items-center flex-wrap">{children}</div>
      ) : (
        <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
      )}
    </div>
  );
}
