import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, Send, Check, X, Save, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
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
import { ProposalPDFTemplate } from "@/components/orcamentos/ProposalPDFTemplate";
import { ScopeItemsEditor } from "@/components/orcamentos/ScopeItemsEditor";
import { ConsiderationsEditor } from "@/components/orcamentos/ConsiderationsEditor";
import { LogoUploader } from "@/components/orcamentos/LogoUploader";
import { OrcamentoStatusBadge } from "@/components/orcamentos/OrcamentoStatusBadge";
import {
  calculateScopeTotal,
  effectiveStatus,
  formatBRL,
  type ScopeItem,
} from "@/lib/orcamentos/calculateTotal";
import { useConfirm } from "@/components/ConfirmDialog";

const PDF_DOM_ID = "proposal-pdf-template-live";

export default function OrcamentoEditarDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { data, isLoading } = useProposalDetail(id);
  const update = useUpdateProposal();
  const gen = useGeneratePDF();

  // Local form state — edits are batched until "Salvar" or auto-save on blur
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
  const [templateKey, setTemplateKey] = useState<string>("anbi");
  const [zoom, setZoom] = useState(0.5);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!data) return;
    isInitialLoad.current = true;
    setClientName(data.client_company_name || "");
    setClientCity(data.client_city || "");
    setClientLogoUrl(data.client_logo_url || null);
    setScopeItems(
      Array.isArray(data.scope_items) ? (data.scope_items as ScopeItem[]) : []
    );
    setMaintenance(
      data.maintenance_monthly_value ? Number(data.maintenance_monthly_value) : ""
    );
    setMaintenanceDesc(data.maintenance_description || "");
    setImplementationDays(data.implementation_days || 30);
    setValidationDays(data.validation_days || 7);
    setConsiderations(
      Array.isArray(data.considerations) ? (data.considerations as string[]) : []
    );
    setValidUntil(data.valid_until || "");
    setTemplateKey((data as any).template_key || "anbi");
    setDirty(false);
    setLastSavedAt(data.updated_at ? new Date(data.updated_at) : null);
    // Reset initial load flag after state settles
    setTimeout(() => { isInitialLoad.current = false; }, 0);
  }, [data?.id]);

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

  async function save(extra: Record<string, any> = {}, opts: { silent?: boolean } = {}) {
    if (!id) return;
    await update.mutateAsync({
      id,
      payload: {
        client_company_name: clientName.trim() || "Cliente",
        client_city: clientCity || null,
        client_logo_url: clientLogoUrl,
        scope_items: scopeItems,
        maintenance_monthly_value:
          typeof maintenance === "number" && maintenance > 0 ? maintenance : null,
        maintenance_description: maintenanceDesc || null,
        implementation_days: implementationDays,
        validation_days: validationDays,
        considerations,
        valid_until: validUntil,
        template_key: templateKey,
        ...extra,
      },
    });
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
    }, 2000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dirty,
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
  ]);

  async function handleMarkSent() {
    if (scopeItems.length === 0) {
      toast.error("Adicione pelo menos um item antes de enviar");
      return;
    }
    const ok = await confirm({
      title: "Marcar como enviado?",
      description:
        "Após marcar como enviado, edições não bloqueiam mas você verá um aviso.",
      confirmLabel: "Marcar como enviado",
    });
    if (!ok) return;
    await save({ status: "enviado", sent_at: new Date().toISOString() });
    toast.success("Proposta marcada como enviada");
  }
  async function handleAccept() {
    await save({ status: "aceito", accepted_at: new Date().toISOString() });
    toast.success("Proposta aceita");
  }
  async function handleReject() {
    await save({ status: "recusado", rejected_at: new Date().toISOString() });
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
    });
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const total = calculateScopeTotal(scopeItems);
  const monthlyTotal = typeof maintenance === "number" && maintenance > 0 ? maintenance : 0;
  const eff = effectiveStatus(data.status as any, validUntil);
  const isLocked = data.status === "aceito" || data.status === "cancelado";
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
          <span
            className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground"
            title="Template visual aplicado ao PDF"
          >
            {templateKey}
          </span>
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
            <Button size="sm" onClick={handleMarkSent}>
              <Send className="h-3.5 w-3.5" /> Marcar como enviado
            </Button>
          )}
          {data.status === "enviado" && (
            <>
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={handleAccept}>
                <Check className="h-3.5 w-3.5" /> Aceitar
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
        {/* Editor (left) */}
        <div className="overflow-y-auto p-5 space-y-5 border-r border-border">
          {isLocked && (
            <div className="rounded-md bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
              Esta proposta está em status <strong>{data.status}</strong>. Edições ainda são possíveis mas afetam o registro histórico.
            </div>
          )}

          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Cliente
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome / razão social</Label>
                <Input
                  value={clientName}
                  onChange={(e) => markDirty(setClientName)(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Cidade (rodapé/contexto)</Label>
                <Input
                  value={clientCity}
                  onChange={(e) => markDirty(setClientCity)(e.target.value)}
                  className="h-9"
                  placeholder="São Paulo, SP"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Logo do cliente</Label>
              <LogoUploader
                proposalId={data.id}
                value={clientLogoUrl}
                onChange={(url) => {
                  markDirty(setClientLogoUrl)(url);
                }}
              />
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Itens da proposta
            </h2>
            <ScopeItemsEditor
              items={scopeItems}
              onChange={markDirty(setScopeItems)}
            />
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total dos itens</span>
              <span className="text-lg font-bold text-success tabular-nums">
                {formatBRL(total)}
              </span>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Manutenção mensal (opcional)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={maintenanceDesc}
                  onChange={(e) => markDirty(setMaintenanceDesc)(e.target.value)}
                  placeholder="Tokens + Servidor + Desenvolvedor"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Valor mensal (R$)</Label>
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
                  className="h-9 text-right tabular-nums"
                />
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Prazos
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Implementação (dias)</Label>
                <Input
                  type="number"
                  min="0"
                  value={implementationDays}
                  onChange={(e) =>
                    markDirty(setImplementationDays)(parseInt(e.target.value) || 0)
                  }
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Validação (dias)</Label>
                <Input
                  type="number"
                  min="0"
                  value={validationDays}
                  onChange={(e) =>
                    markDirty(setValidationDays)(parseInt(e.target.value) || 0)
                  }
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Validade da proposta</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => markDirty(setValidUntil)(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <ConsiderationsEditor
              items={considerations}
              onChange={markDirty(setConsiderations)}
            />
          </Card>

          {data.status === "recusado" && (
            <Card className="p-4 space-y-2">
              <Label className="text-xs">Motivo da recusa (opcional)</Label>
              <Textarea
                defaultValue={data.rejection_reason || ""}
                onBlur={(e) =>
                  update.mutate({
                    id: data.id,
                    payload: { rejection_reason: e.target.value || null },
                  })
                }
                placeholder="Ex: cliente escolheu concorrente"
              />
            </Card>
          )}
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
    </div>
  );
}
