/**
 * Página `/financeiro/orcamentos/:id/editar` — orquestrador da nova UI por
 * tabs (Fase 1 do redesign 10E).
 *
 * Responsabilidades:
 *  - Hidrata estado de formulário via `useProposalEditorState` (autosave 1.5s).
 *  - Renderiza a estrutura sticky: header + pipeline + tabs.
 *  - Lazy-mount: apenas a tab ativa é renderizada (decisão da Fase 1 com
 *    o usuário). Trocar de tab desmonta o conteúdo anterior, MAS o estado
 *    de form continua vivo no hook acima — nada se perde.
 *  - Action bar fixa no rodapé com ações conforme status.
 *  - Coordena os modais herdados (gerar/enviar, link gerado, redefinir senha,
 *    detalhes de item, tracking, preview PDF).
 */
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { useProposalEditorState } from "@/components/orcamentos/page/useProposalEditorState";
import { useUpdateProposal, useDeleteProposal } from "@/hooks/orcamentos/useUpdateProposal";
import { useGenerateProposalPDF } from "@/hooks/orcamentos/useGenerateProposalPDF";
import {
  useProposalInteractionsCount,
  useRecordAutoInteraction,
} from "@/hooks/orcamentos/useProposalInteractions";
import { useProposalVersions } from "@/hooks/orcamentos/useProposalVersions";

import { ProposalPageHeader } from "@/components/orcamentos/page/ProposalPageHeader";
import { ProposalStagePipeline } from "@/components/orcamentos/page/ProposalStagePipeline";
import {
  ProposalTabsBar,
  isProposalTabKey,
  type ProposalTabKey,
} from "@/components/orcamentos/page/ProposalTabsBar";
import { ProposalActionBar } from "@/components/orcamentos/page/ProposalActionBar";

import { TabResumo } from "@/components/orcamentos/page/tabs/TabResumo";
import { TabCliente } from "@/components/orcamentos/page/tabs/TabCliente";
import { TabEscopo } from "@/components/orcamentos/page/tabs/TabEscopo";
// TabConteudoIA removido — narrativa migrada para TabEscopo
import { TabPaginaPublica } from "@/components/orcamentos/page/tabs/TabPaginaPublica";
import { TabInteracoes } from "@/components/orcamentos/page/tabs/TabInteracoes";
import { TabConfiguracoes } from "@/components/orcamentos/page/tabs/TabConfiguracoes";

import { AbaHistorico } from "@/components/orcamentos/abas/AbaHistorico";
import { AbaVersoes } from "@/components/orcamentos/abas/AbaVersoes";
import { AbaAnexos } from "@/components/orcamentos/abas/AbaAnexos";

import { PreviewPdfDialog } from "@/components/orcamentos/PreviewPdfDialog";
import { GerarEEnviarDialog } from "@/components/orcamentos/GerarEEnviarDialog";
import { LinkGeradoDialog } from "@/components/orcamentos/LinkGeradoDialog";
import { RedefinirSenhaDialog } from "@/components/orcamentos/RedefinirSenhaDialog";
import { ItemDetailsDialog } from "@/components/orcamentos/ItemDetailsDialog";
import { PropostaTrackingSheet } from "@/components/orcamentos/PropostaTrackingSheet";
import { useConfirm } from "@/components/ConfirmDialog";

import { defaultProposalPassword } from "@/lib/orcamentos/companySlug";
import { previewProposalAsClient } from "@/lib/orcamentos/previewAsClient";
import { effectiveStatus, type ProposalStatus } from "@/lib/orcamentos/calculateTotal";
import type { GenerationType } from "@/lib/orcamentos/generateContent";
import { Card } from "@/components/ui/card";
import { useSearchParams } from "react-router-dom";

function getInitialTab(): ProposalTabKey {
  if (typeof window === "undefined") return "resumo";
  const tab = new URLSearchParams(window.location.search).get("tab");
  return isProposalTabKey(tab) ? tab : "resumo";
}

export default function OrcamentoEditarDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const editor = useProposalEditorState(id);
  const { detail, state, setField, setItems, dirty, isSaving, lastSavedAt, save, buildPreviewProposal } = editor;

  const update = useUpdateProposal();
  const del = useDeleteProposal();
  const genPdf = useGenerateProposalPDF();
  const recordAuto = useRecordAutoInteraction();

  const interactionsCount = useProposalInteractionsCount(id);
  const versionsQuery = useProposalVersions(id);

  // Tab control
  const [activeTab, setActiveTab] = useState<ProposalTabKey>(getInitialTab());
  const [, setSearchParams] = useSearchParams();
  const handleTabChange = useCallback(
    (tab: ProposalTabKey) => {
      setActiveTab(tab);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", tab);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Modais
  const [previewPdfOpen, setPreviewPdfOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [detailsItemIdx, setDetailsItemIdx] = useState<number | null>(null);
  const [generatedTokenInfo, setGeneratedTokenInfo] = useState<{
    accessToken: string;
    expiresAt: string;
    password?: string | null;
  } | null>(null);

  // ──────────── States derivados ────────────
  if (detail.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <h2 className="text-lg font-semibold">Proposta não encontrada</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {detail.error
            ? "Ocorreu um erro ao carregar esta proposta. Ela pode ter sido excluída ou você não tem permissão para vê-la."
            : "Esta proposta não existe mais ou foi removida."}
        </p>
        <Button onClick={() => navigate("/financeiro/orcamentos")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para propostas
        </Button>
      </div>
    );
  }

  const data = detail.data;
  const eff = effectiveStatus(data.status as any, state.validUntil) as ProposalStatus;
  const isLocked = data.status === "convertida";
  const accessToken = (data as any).access_token as string | null;
  const hasPublicLink = !!accessToken;

  // ──────────── Handlers de ações ────────────
  function handleAiGenerated(type: GenerationType, content: any) {
    if (type === "full_content" && content && typeof content === "object") {
      if (content.executive_summary) setField("executiveSummary", content.executive_summary);
      if (content.pain_context) setField("painContext", content.pain_context);
      if (content.solution_overview) setField("solutionOverview", content.solution_overview);
      return;
    }
    if (typeof content !== "string") return;
    if (type === "executive_summary") setField("executiveSummary", content);
    else if (type === "pain_context") setField("painContext", content);
    else if (type === "solution_overview") setField("solutionOverview", content);
  }

  async function handleOpenSendDialog() {
    if (state.scopeItems.length === 0) {
      toast.error("Adicione pelo menos um item antes de enviar");
      handleTabChange("escopo");
      return;
    }
    if (!state.validUntil) {
      toast.error("Defina uma data de validade antes de enviar");
      handleTabChange("escopo");
      return;
    }
    if (dirty) {
      try {
        await save({}, { silent: true });
      } catch {
        return;
      }
    }
    setSendDialogOpen(true);
  }

  async function handleDownloadPdf() {
    if (!id) return;
    if (dirty) {
      try {
        await save({}, { silent: true });
      } catch {
        return;
      }
    }
    genPdf.mutate({
      proposalId: id,
      proposal: { ...data, ...buildPreviewProposal() },
      templateKey: state.templateKey,
      isRegeneration: data.status !== "rascunho",
      triggerDownload: true,
    });
  }

  async function handleCopyLink() {
    if (!accessToken) {
      toast.error("Esta proposta ainda não tem link público");
      return;
    }
    const url = `${window.location.origin}/p/${accessToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar — copie manualmente");
    }
  }

  async function handlePreviewAsClient() {
    const tid = toast.loading("Gerando preview pré-autenticado…");
    try {
      const { url, popupBlocked } = await previewProposalAsClient({
        proposalId: data.id,
        accessToken,
      });
      if (popupBlocked) {
        toast.warning("Pop-up bloqueado pelo navegador", {
          id: tid,
          description: "Permita pop-ups deste site ou abra o link manualmente.",
          action: {
            label: "Abrir mesmo assim",
            onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
          },
          duration: 8000,
        });
        // Tenta também copiar para clipboard como rede de segurança
        navigator.clipboard?.writeText(url).catch(() => {});
      } else {
        toast.success("Preview aberto em nova aba", { id: tid });
      }
    } catch (e: any) {
      toast.error(e?.message || "Falha ao abrir preview", { id: tid });
    }
  }

  async function handleOpenWhatsApp() {
    if (!accessToken) {
      toast.error("Disponível após enviar a proposta");
      return;
    }
    const url = `${window.location.origin}/p/${accessToken}`;
    const msg = `Olá! Segue o link da nossa proposta para a ${state.clientName || data.client_company_name}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    // Auto-registro silencioso
    if (id) {
      recordAuto.mutate({
        proposalId: id,
        channel: "whatsapp",
        direction: "outbound",
        interactionAt: new Date().toISOString(),
        summary: "Link da proposta enviado por WhatsApp",
        details: null,
        autoGenerated: true,
        metadata: { trigger: "action_bar" },
      });
    }
  }

  async function handleSave() {
    try {
      await save();
    } catch {
      // toast vem do hook
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Excluir esta proposta?",
      description:
        data.status === "rascunho"
          ? "Como ainda é rascunho, será removida da listagem. Esta ação pode ser revertida no banco."
          : "Esta proposta já foi enviada. Excluir vai removê-la do CRM e do controle financeiro.",
      confirmLabel: "Excluir",
      variant: "destructive",
    });
    if (!ok || !id) return;
    try {
      await del.mutateAsync(id);
      toast.success("Proposta excluída");
      navigate("/financeiro/orcamentos");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir");
    }
  }

  // ──────────── Render ────────────
  const tabBadges = {
    escopo: state.scopeItems.length,
    interacoes: interactionsCount.data || 0,
    versoes: versionsQuery.data?.length || 0,
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Header + pipeline + tabs (sticky em conjunto) */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <ProposalPageHeader
          proposal={data}
          effectiveStatus={eff}
          isSaving={isSaving}
          isDirty={dirty}
          lastSavedAt={lastSavedAt}
        />
        <div className="px-3 sm:px-5 py-2 border-b border-border/60">
          <ProposalStagePipeline status={eff} />
        </div>
        <ProposalTabsBar active={activeTab} badges={tabBadges} onChange={handleTabChange} />
      </div>

      {/* Conteúdo principal — lazy mount por tab */}
      <main className="flex-1 px-3 sm:px-5 py-5 max-w-[1400px] w-full mx-auto">
        {isLocked && (
          <Card className="mb-4 p-3 border-amber-500/30 bg-amber-500/5 text-xs text-foreground/80">
            Esta proposta está em status <strong>{data.status}</strong>. Edições ainda
            são possíveis mas afetam o registro histórico.
          </Card>
        )}

        {activeTab === "resumo" && (
          <TabResumo
            proposal={data}
            livePreview={buildPreviewProposal()}
            interactionsCount={interactionsCount.data || 0}
            onPreviewAsClient={handlePreviewAsClient}
            onCopyLink={handleCopyLink}
            onOpenTracking={() => setTrackingOpen(true)}
            onPreviewPdf={() => setPreviewPdfOpen(true)}
            onOpenSendDialog={handleOpenSendDialog}
            onGoToTab={(t) => isProposalTabKey(t) && handleTabChange(t)}
            setField={setField}
            setItems={setItems}
            dealClientLink={(data as any).deal || null}
            onLinkChanged={() => detail.refetch?.()}
          />
        )}

        {activeTab === "cliente" && (
          <TabCliente
            proposalId={data.id}
            state={state}
            setField={setField}
          />
        )}

        {activeTab === "escopo" && (
          <TabEscopo
            proposalId={data.id}
            hasDealLink={!!data.deal_id}
            isLocked={isLocked}
            state={state}
            setField={setField}
            setItems={setItems}
            onOpenItemDetails={(idx) => {
              if (dirty) {
                toast.info("Aguarde o autosave concluir antes de detalhar.");
                return;
              }
              setDetailsItemIdx(idx);
            }}
            dealPainDescription={(data as any).deal?.pain_description || null}
            onAiGenerated={handleAiGenerated}
          />
        )}

        {activeTab === "pagina_publica" && (
          <TabPaginaPublica
            proposal={data}
            state={state}
            setField={setField}
            onPreviewAsClient={handlePreviewAsClient}
            onOpenSendDialog={handleOpenSendDialog}
            onPasswordUpdated={() => {
              detail.refetch?.();
            }}
          />
        )}

        {activeTab === "historico" && <AbaHistorico proposalId={data.id} />}

        {activeTab === "interacoes" && <TabInteracoes proposalId={data.id} />}

        {activeTab === "versoes" && <AbaVersoes proposalId={data.id} />}

        {activeTab === "configuracoes" && (
          <div className="space-y-4">
            <TabConfiguracoes
              proposal={data}
              state={state}
              setField={setField}
              onUpdateField={(field, value) =>
                update.mutate({ id: data.id, payload: { [field]: value } })
              }
              onDelete={handleDelete}
            />
            {/* Anexos integrados ao bloco de configurações para evitar uma 10ª aba */}
            <div className="max-w-3xl">
              <AbaAnexos proposalId={data.id} />
            </div>
          </div>
        )}
      </main>

      {/* Action bar */}
      <ProposalActionBar
        status={eff}
        isDirty={dirty}
        isSaving={isSaving}
        isGeneratingPdf={genPdf.isPending}
        hasPublicLink={hasPublicLink}
        onDelete={handleDelete}
        onCopyLink={handleCopyLink}
        onPreviewAsClient={handlePreviewAsClient}
        onDownloadPdf={handleDownloadPdf}
        onOpenWhatsApp={handleOpenWhatsApp}
        onSave={handleSave}
        onSendOrResend={handleOpenSendDialog}
      />

      {/* Modais */}
      {confirmDialog}
      <PreviewPdfDialog
        open={previewPdfOpen}
        onOpenChange={setPreviewPdfOpen}
        proposal={{ ...data, ...buildPreviewProposal() }}
        templateKey={state.templateKey}
      />
      <GerarEEnviarDialog
        proposalId={data.id}
        proposalCode={data.code}
        suggestedPassword={defaultProposalPassword(state.clientName || data.client_company_name)}
        clientLabel={state.clientName || data.client_company_name}
        expiresAt={state.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        onDone={(info) => {
          setGeneratedTokenInfo(info);
          setField("validUntil", info.expiresAt);
          detail.refetch?.();
        }}
      />
      <LinkGeradoDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        accessToken={generatedTokenInfo?.accessToken ?? null}
        expiresAt={generatedTokenInfo?.expiresAt ?? state.validUntil}
        password={generatedTokenInfo?.password ?? null}
      />
      <RedefinirSenhaDialog
        proposalId={data.id}
        proposalCode={data.code}
        open={pwdDialogOpen}
        onOpenChange={setPwdDialogOpen}
      />
      {detailsItemIdx !== null && (
        <ItemDetailsDialog
          proposalId={data.id}
          orderIndex={detailsItemIdx}
          itemTitle={state.scopeItems[detailsItemIdx]?.title || `Item ${detailsItemIdx + 1}`}
          open={detailsItemIdx !== null}
          onOpenChange={(o) => !o && setDetailsItemIdx(null)}
        />
      )}
      <PropostaTrackingSheet
        open={trackingOpen}
        onOpenChange={setTrackingOpen}
        proposalId={data.id}
        proposalCode={data.code}
      />
    </div>
  );
}
