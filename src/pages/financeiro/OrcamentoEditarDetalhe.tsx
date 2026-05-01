import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, Send, X, Save, ZoomIn, ZoomOut, Loader2, KeyRound, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useProposalDetail } from "@/hooks/orcamentos/useProposalDetail";
import { useUpdateProposal } from "@/hooks/orcamentos/useUpdateProposal";
import { useGeneratePDF } from "@/hooks/orcamentos/useGeneratePDF";
import { useProposalItems, useReplaceProposalItems } from "@/hooks/orcamentos/useProposalItems";
import { ProposalPDFTemplate } from "@/components/orcamentos/ProposalPDFTemplate";
import { NotionItemsEditor } from "@/components/orcamentos/NotionItemsEditor";
import { ConsiderationsEditor } from "@/components/orcamentos/ConsiderationsEditor";
import { LogoUploader } from "@/components/orcamentos/LogoUploader";
import { OrcamentoStatusBadge } from "@/components/orcamentos/OrcamentoStatusBadge";
import { MarcarComoEnviadaDialog } from "@/components/orcamentos/MarcarComoEnviadaDialog";
import { LinkGeradoDialog } from "@/components/orcamentos/LinkGeradoDialog";
import { RedefinirSenhaDialog } from "@/components/orcamentos/RedefinirSenhaDialog";
import { ItemDetailsDialog } from "@/components/orcamentos/ItemDetailsDialog";
import {
  calculateScopeTotal,
  effectiveStatus,
  formatBRL,
  type ScopeItem,
} from "@/lib/orcamentos/calculateTotal";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listTemplates } from "@/lib/orcamentos/templates";

const PDF_DOM_ID = "proposal-pdf-template-live";

/** Adapter ScopeItem (UI legado) ↔ proposal_items canônico */
function canonicalToScopeItems(
  rows: Array<{ description: string; unit_price: number | string; quantity: number | string }>
): ScopeItem[] {
  return rows.map((r) => ({
    title: r.description,
    description: "",
    value: (Number(r.unit_price) || 0) * (Number(r.quantity) || 1),
  }));
}

export default function OrcamentoEditarDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { data, isLoading, error } = useProposalDetail(id);
  const { data: itemsRows } = useProposalItems(id);
  const replaceItems = useReplaceProposalItems();
  const update = useUpdateProposal();
  const gen = useGeneratePDF();

  // Local form state — edits are batched until "Salvar" or auto-save on blur
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null);
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
  const [maintenance, setMaintenance] = useState<number | "">("");
  const [maintenanceDesc, setMaintenanceDesc] = useState("");
  const [implementationDays, setImplementationDays] = useState(30);
  const [validationDays, setValidationDays] = useState(7);
  const [considerations, setConsiderations] = useState<string[]>([]);
  const [validUntil, setValidUntil] = useState("");
  const [mockupUrl, setMockupUrl] = useState("");
  const [templateKey, setTemplateKey] = useState<string>("inovacao_tecnologica");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [painContext, setPainContext] = useState("");
  const [solutionOverview, setSolutionOverview] = useState("");
  const [clientBrandColor, setClientBrandColor] = useState<string>("");
  const [zoom, setZoom] = useState(0.5);
  const [dirty, setDirty] = useState(false);
  const [itemsDirty, setItemsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  // Modais novos do prompt 10A
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [generatedTokenInfo, setGeneratedTokenInfo] = useState<{ accessToken: string; expiresAt: string; password?: string | null } | null>(null);
  const [detailsItemIdx, setDetailsItemIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!data) return;
    isInitialLoad.current = true;
    setTitle((data as any).title || "");
    setClientName(data.client_company_name || "");
    setClientCity(data.client_city || "");
    setClientLogoUrl(data.client_logo_url || null);
    setMaintenance(
      data.maintenance_monthly_value ? Number(data.maintenance_monthly_value) : ""
    );
    setMaintenanceDesc(data.maintenance_description || "");
    setImplementationDays(data.implementation_days || 30);
    setValidationDays(data.validation_days || 7);
    setConsiderations(
      Array.isArray(data.considerations) ? (data.considerations as string[]) : []
    );
    setValidUntil((data as any).expires_at || data.valid_until || "");
    setMockupUrl((data as any).mockup_url || "");
    setTemplateKey((data as any).template_key || "inovacao_tecnologica");
    setWelcomeMessage((data as any).welcome_message || "");
    setExecutiveSummary((data as any).executive_summary || "");
    setPainContext((data as any).pain_context || "");
    setSolutionOverview((data as any).solution_overview || "");
    setClientBrandColor((data as any).client_brand_color || "");
    setDirty(false);
    setItemsDirty(false);
    setLastSavedAt(data.updated_at ? new Date(data.updated_at) : null);
    setTimeout(() => { isInitialLoad.current = false; }, 0);
  }, [data?.id]);

  // Carrega itens canônicos para o estado local (formato ScopeItem para a UI atual)
  useEffect(() => {
    if (!itemsRows) return;
    if (itemsDirty) return; // não sobrescreve edição em andamento
    setScopeItems(canonicalToScopeItems(itemsRows as any));
  }, [itemsRows, itemsDirty]);

  const previewProposal = useMemo(
    () => ({
      client_company_name: clientName,
      client_logo_url: clientLogoUrl,
      scope_items: scopeItems,
      maintenance_monthly_value: typeof maintenance === "number" ? maintenance : null,
      maintenance_description: maintenanceDesc || null,
      implementation_days: implementationDays,
      validation_days: validationDays,
      considerations,
      valid_until: validUntil,
    }),
    [
      clientName,
      clientLogoUrl,
      scopeItems,
      maintenance,
      maintenanceDesc,
      implementationDays,
      validationDays,
      considerations,
      validUntil,
    ]
  );

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setDirty(true);
    };
  }
  function markItemsDirty(next: ScopeItem[]) {
    setScopeItems(next);
    setItemsDirty(true);
    setDirty(true);
  }

  async function save(extra: Record<string, any> = {}, opts: { silent?: boolean } = {}) {
    if (!id) return;
    await update.mutateAsync({
      id,
      payload: {
        title: title.trim() || null,
        client_company_name: clientName.trim() || "Cliente",
        client_city: clientCity || null,
        client_logo_url: clientLogoUrl,
        scope_items: scopeItems, // legado mantido p/ compat com PDF
        maintenance_monthly_value:
          typeof maintenance === "number" && maintenance > 0 ? maintenance : null,
        maintenance_description: maintenanceDesc || null,
        implementation_days: implementationDays,
        validation_days: validationDays,
        considerations,
        valid_until: validUntil,
        expires_at: validUntil || null,
        mockup_url: mockupUrl.trim() || null,
        template_key: templateKey,
        welcome_message: welcomeMessage.trim() || null,
        executive_summary: executiveSummary.trim() || null,
        pain_context: painContext.trim() || null,
        solution_overview: solutionOverview.trim() || null,
        client_brand_color: clientBrandColor.trim() || null,
        ...extra,
      },
    });
    // Persiste itens canônicos só se houve mudança neles
    if (itemsDirty) {
      await replaceItems.mutateAsync({
        proposalId: id,
        items: scopeItems.map((it, i) => ({
          description: it.title || "Item",
          quantity: 1,
          unit_price: Number(it.value) || 0,
          order_index: i,
        })),
      });
      setItemsDirty(false);
    }
    setDirty(false);
    setLastSavedAt(new Date());
    if (!opts.silent) toast.success("Salvo");
  }

  // Autosave: 2s de debounce após qualquer mudança
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (!dirty) return;
    if (!id) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      save({}, { silent: true }).catch(() => {});
    }, 1500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dirty,
    title,
    clientName,
    clientCity,
    clientLogoUrl,
    scopeItems,
    maintenance,
    maintenanceDesc,
    implementationDays,
    validationDays,
    considerations,
    validUntil,
    mockupUrl,
    templateKey,
    welcomeMessage,
    executiveSummary,
    painContext,
    solutionOverview,
    clientBrandColor,
  ]);

  function handleOpenSendDialog() {
    if (scopeItems.length === 0) {
      toast.error("Adicione pelo menos um item antes de enviar");
      return;
    }
    if (!validUntil) {
      toast.error("Defina uma data de validade antes de enviar");
      return;
    }
    setSendDialogOpen(true);
  }
  async function handleReject() {
    const ok = await confirm({
      title: "Recusar proposta?",
      description: "Você pode criar uma nova versão depois.",
      confirmLabel: "Recusar",
      variant: "destructive",
    });
    if (!ok) return;
    await save({ status: "recusada", rejected_at: new Date().toISOString() });
    toast.success("Proposta recusada");
  }

  async function handleDownload() {
    if (dirty) await save();
    if (!data || !id) return;
    gen.mutate({
      proposalId: id,
      code: data.code,
      clientName: clientName || data.client_company_name,
      elementId: PDF_DOM_ID,
      snapshot: {
        client_company_name: clientName,
        client_logo_url: clientLogoUrl,
        client_city: clientCity,
        scope_items: scopeItems,
        maintenance_monthly_value:
          typeof maintenance === "number" && maintenance > 0 ? maintenance : null,
        maintenance_description: maintenanceDesc || null,
        implementation_days: implementationDays,
        validation_days: validationDays,
        considerations,
        valid_until: validUntil,
        template_key: templateKey,
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <h2 className="text-lg font-semibold">Proposta não encontrada</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error
            ? "Ocorreu um erro ao carregar esta proposta. Ela pode ter sido excluída ou você não tem permissão para vê-la."
            : "Esta proposta não existe mais ou foi removida."}
        </p>
        <Button onClick={() => navigate("/financeiro/orcamentos")}>
          <ArrowLeft className="h-4 w-4" /> Voltar para propostas
        </Button>
      </div>
    );
  }

  const total = calculateScopeTotal(scopeItems);
  const monthlyTotal = typeof maintenance === "number" && maintenance > 0 ? maintenance : 0;
  const eff = effectiveStatus(data.status as any, validUntil);
  const isLocked = data.status === "convertida";
  const savedLabel = lastSavedAt
    ? `Salvo às ${lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "—";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header bar */}
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 py-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/financeiro/orcamentos")}
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-sm">{data.code}</span>
          <OrcamentoStatusBadge status={eff} />
          <Select
            value={templateKey}
            onValueChange={(v) => {
              setTemplateKey(v);
              setDirty(true);
            }}
          >
            <SelectTrigger className="h-7 w-[180px] text-xs">
              <SelectValue placeholder="Template" />
            </SelectTrigger>
            <SelectContent>
              {listTemplates().map((t) => (
                <SelectItem key={t.key} value={t.key} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data.deal && (
            <Link
              to={`/crm/deals/${data.deal.code}`}
              className="text-xs text-accent hover:underline"
            >
              ↳ {data.deal.code}
            </Link>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Itens (one-time)
              </span>
              <span className="text-success font-bold tabular-nums text-sm">
                {formatBRL(total)}
              </span>
            </div>
            <div className="h-7 w-px bg-border" />
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Manutenção mensal
              </span>
              <span className={`${monthlyTotal > 0 ? "text-primary" : "text-muted-foreground"} font-bold tabular-nums text-sm`}>
                {monthlyTotal > 0 ? formatBRL(monthlyTotal) : "—"}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {update.isPending ? (
              <span className="text-amber-500 inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
              </span>
            ) : dirty ? (
              <span className="text-amber-500">• não salvo</span>
            ) : (
              savedLabel
            )}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => save()}
            disabled={!dirty || update.isPending}
          >
            <Save className="h-3.5 w-3.5" />
            {update.isPending ? "Salvando…" : "Salvar"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload} disabled={gen.isPending}>
            {gen.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            PDF
          </Button>
          {data.status === "rascunho" && (
            <Button size="sm" onClick={handleOpenSendDialog}>
              <Send className="h-3.5 w-3.5" /> Marcar como enviada
            </Button>
          )}
          {data.status === "enviada" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if ((data as any).access_token) {
                    setGeneratedTokenInfo({
                      accessToken: (data as any).access_token,
                      expiresAt: validUntil,
                    });
                    setLinkDialogOpen(true);
                  } else {
                    toast.error("Esta proposta não tem link de acesso ainda");
                  }
                }}
              >
                <Link2 className="h-3.5 w-3.5" /> Ver link
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPwdDialogOpen(true)}>
                <KeyRound className="h-3.5 w-3.5" /> Redefinir senha
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={handleReject}>
                <X className="h-3.5 w-3.5" /> Recusar
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Body — split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 min-h-0">
        {/* Editor (left) — Notion-like single column */}
        <div className="overflow-y-auto border-r border-border">
          <div className="mx-auto max-w-2xl px-8 py-10 space-y-10">
            {isLocked && (
              <div className="rounded-md bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
                Esta proposta está em status <strong>{data.status}</strong>. Edições ainda são possíveis mas afetam o registro histórico.
              </div>
            )}

            {/* Título — tipo H1 de documento */}
            <div>
              <Input
                value={title}
                onChange={(e) => markDirty(setTitle)(e.target.value)}
                placeholder="Título da proposta"
                className="h-auto border-0 bg-transparent px-0 py-1 text-3xl font-bold tracking-tight shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/30"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Aparece no topo da página pública e no PDF.
              </p>
            </div>

            {/* Cliente */}
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Nome / razão social</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => markDirty(setClientName)(e.target.value)}
                    className="h-9 border-0 border-b border-border/50 rounded-none bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-foreground"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Cidade</Label>
                  <Input
                    value={clientCity}
                    onChange={(e) => markDirty(setClientCity)(e.target.value)}
                    className="h-9 border-0 border-b border-border/50 rounded-none bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-foreground"
                    placeholder="São Paulo, SP"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground mb-1.5 block">Logo</Label>
                <LogoUploader
                  proposalId={data.id}
                  value={clientLogoUrl}
                  onChange={(url) => markDirty(setClientLogoUrl)(url)}
                />
              </div>
            </section>

            {/* Mensagem de boas-vindas */}
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Boas-vindas</h2>
              <Textarea
                value={welcomeMessage}
                onChange={(e) => markDirty(setWelcomeMessage)(e.target.value)}
                rows={2}
                placeholder="Olá! Esta é a proposta preparada especialmente para…"
                className="border-0 border-l-2 border-border/50 rounded-none bg-transparent px-3 py-1 shadow-none focus-visible:ring-0 focus-visible:border-foreground italic text-muted-foreground/90 resize-none"
              />
            </section>

            {/* Resumo executivo */}
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo executivo</h2>
              <Textarea
                value={executiveSummary}
                onChange={(e) => markDirty(setExecutiveSummary)(e.target.value)}
                rows={5}
                placeholder="3-4 parágrafos descrevendo a proposta em alto nível."
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 resize-none text-base leading-relaxed"
              />
            </section>

            {/* Contexto / dor */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contexto e dor
                </h2>
                {data.deal && (data.deal as any).pain_description && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => markDirty(setPainContext)((data.deal as any).pain_description)}
                  >
                    Importar do deal
                  </Button>
                )}
              </div>
              <Textarea
                value={painContext}
                onChange={(e) => markDirty(setPainContext)(e.target.value)}
                rows={4}
                placeholder="O que o cliente está enfrentando hoje."
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 resize-none text-base leading-relaxed"
              />
            </section>

            {/* Visão geral da solução */}
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Visão geral da solução
              </h2>
              <Textarea
                value={solutionOverview}
                onChange={(e) => markDirty(setSolutionOverview)(e.target.value)}
                rows={4}
                placeholder="A solução em alto nível. Os módulos detalhados ficam em cada item abaixo."
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 resize-none text-base leading-relaxed"
              />
            </section>

            {/* Itens — Notion-like com DnD */}
            <section className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Módulos da proposta
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  Total: <span className="font-bold text-success tabular-nums">{formatBRL(total)}</span>
                </span>
              </div>
              <NotionItemsEditor
                items={scopeItems}
                onChange={markItemsDirty}
                onOpenDetails={(idx) => {
                  if (itemsDirty || dirty) {
                    toast.info("Aguarde o autosave concluir antes de detalhar.");
                    return;
                  }
                  setDetailsItemIdx(idx);
                }}
              />
            </section>

            {/* Manutenção mensal */}
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Manutenção mensal <span className="text-muted-foreground/50 normal-case font-normal tracking-normal">(opcional)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Descrição</Label>
                  <Input
                    value={maintenanceDesc}
                    onChange={(e) => markDirty(setMaintenanceDesc)(e.target.value)}
                    placeholder="Tokens + Servidor + Desenvolvedor"
                    className="h-9 border-0 border-b border-border/50 rounded-none bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-foreground"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Valor mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={maintenance}
                    onChange={(e) =>
                      markDirty(setMaintenance)(
                        e.target.value === "" ? "" : (parseFloat(e.target.value) || 0)
                      )
                    }
                    className="h-9 border-0 border-b border-border/50 rounded-none bg-transparent px-0 text-right tabular-nums font-mono shadow-none focus-visible:ring-0 focus-visible:border-foreground"
                  />
                </div>
              </div>
            </section>

            {/* Prazos */}
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prazos</h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Implementação (dias)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={implementationDays}
                    onChange={(e) => markDirty(setImplementationDays)(parseInt(e.target.value) || 0)}
                    className="h-9 border-0 border-b border-border/50 rounded-none bg-transparent px-0 tabular-nums shadow-none focus-visible:ring-0 focus-visible:border-foreground"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Validação (dias)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={validationDays}
                    onChange={(e) => markDirty(setValidationDays)(parseInt(e.target.value) || 0)}
                    className="h-9 border-0 border-b border-border/50 rounded-none bg-transparent px-0 tabular-nums shadow-none focus-visible:ring-0 focus-visible:border-foreground"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Validade da proposta</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => markDirty(setValidUntil)(e.target.value)}
                    className="h-9 border-0 border-b border-border/50 rounded-none bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-foreground"
                  />
                </div>
              </div>
            </section>

            {/* Considerações */}
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Considerações</h2>
              <ConsiderationsEditor
                items={considerations}
                onChange={markDirty(setConsiderations)}
              />
            </section>

            {/* Identidade visual */}
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cor de marca <span className="text-muted-foreground/50 normal-case font-normal tracking-normal">(opcional)</span>
              </h2>
              <div className="flex items-center gap-2">
                <div
                  className="h-9 w-9 rounded border border-border flex-shrink-0"
                  style={{ background: clientBrandColor || "transparent" }}
                />
                <Input
                  type="text"
                  value={clientBrandColor}
                  onChange={(e) => markDirty(setClientBrandColor)(e.target.value)}
                  placeholder="#FF6B35"
                  pattern="^#[0-9a-fA-F]{6}$"
                  className="h-9 font-mono text-sm border-0 border-b border-border/50 rounded-none bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-foreground"
                />
                <input
                  type="color"
                  value={clientBrandColor || "#06b6d4"}
                  onChange={(e) => markDirty(setClientBrandColor)(e.target.value)}
                  className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
                />
                {clientBrandColor && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => markDirty(setClientBrandColor)("")}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </section>

            {/* Mockup */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mockup</h2>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                  Beta
                </span>
              </div>
              <Input
                value={mockupUrl}
                onChange={(e) => markDirty(setMockupUrl)(e.target.value)}
                className="h-9 border-0 border-b border-border/50 rounded-none bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-foreground"
                placeholder="https://figma.com/proto/…"
              />
              <p className="text-[10px] text-muted-foreground">
                CTA destacado na página pública e QR code no PDF.
              </p>
            </section>

            {data.status === "recusada" && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Motivo da recusa</h2>
                <Textarea
                  defaultValue={data.rejection_reason || ""}
                  onBlur={(e) =>
                    update.mutate({
                      id: data.id,
                      payload: { rejection_reason: e.target.value || null },
                    })
                  }
                  placeholder="Ex: cliente escolheu concorrente"
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 resize-none"
                />
              </section>
            )}
          </div>
        </div>

        {/* Preview (right) */}
        <div className="overflow-y-auto bg-muted/30 p-4">
          <div className="sticky top-0 z-10 mb-3 flex items-center justify-between bg-muted/30 backdrop-blur py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pré-visualização (3 páginas A4)
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs tabular-nums w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.min(1, +(z + 0.1).toFixed(2)))}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              width: "210mm",
              margin: "0 auto",
            }}
            className="shadow-2xl"
          >
            <ProposalPDFTemplate
              domId={PDF_DOM_ID}
              proposal={previewProposal}
            />
          </div>
          {/* Spacer para o scroll alcançar o final mesmo escalado */}
          <div style={{ height: `${297 * 3 * zoom}mm` }} aria-hidden />
        </div>
      </div>
      {confirmDialog}

      {/* Modal: marcar como enviada (define senha + valida data) */}
      <MarcarComoEnviadaDialog
        proposalId={data.id}
        proposalCode={data.code}
        expiresAt={validUntil || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        onSent={(info) => {
          setGeneratedTokenInfo(info);
          setLinkDialogOpen(true);
          // refresh local: validUntil pode ter mudado
          setValidUntil(info.expiresAt);
          setLastSavedAt(new Date());
        }}
      />

      {/* Modal: link público gerado */}
      <LinkGeradoDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        accessToken={generatedTokenInfo?.accessToken ?? null}
        expiresAt={generatedTokenInfo?.expiresAt ?? validUntil}
        password={generatedTokenInfo?.password ?? null}
      />

      {/* Modal: redefinir senha (proposta já enviada) */}
      <RedefinirSenhaDialog
        proposalId={data.id}
        proposalCode={data.code}
        open={pwdDialogOpen}
        onOpenChange={setPwdDialogOpen}
      />

      {/* Modal: detalhes do módulo (página pública) */}
      {detailsItemIdx !== null && (
        <ItemDetailsDialog
          proposalId={data.id}
          orderIndex={detailsItemIdx}
          itemTitle={scopeItems[detailsItemIdx]?.title || `Item ${detailsItemIdx + 1}`}
          open={detailsItemIdx !== null}
          onOpenChange={(o) => !o && setDetailsItemIdx(null)}
        />
      )}
    </div>
  );
}
