import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, LayoutGrid, Table2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNavigate } from "react-router-dom";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useProposals, type ProposalOrigin } from "@/hooks/orcamentos/useProposals";
import {
  useDeleteProposal,
  useDuplicateProposal,
  useUpdateProposal,
} from "@/hooks/orcamentos/useUpdateProposal";
import { useGenerateProposalPDF } from "@/hooks/orcamentos/useGenerateProposalPDF";
import { OrcamentoKPICards } from "@/components/orcamentos/OrcamentoKPICards";
import { OrcamentoTabela } from "@/components/orcamentos/OrcamentoTabela";
import { OrcamentoKanban } from "@/components/orcamentos/OrcamentoKanban";

import { NovoOrcamentoModal } from "@/components/orcamentos/NovoOrcamentoModal";
import type { ProposalStatus } from "@/lib/orcamentos/calculateTotal";
import { useConfirm } from "@/components/ConfirmDialog";
import { toast } from "sonner";

type StatusFilter = "todos" | ProposalStatus;
type ViewMode = "kanban" | "table";

const STATUS_TABS: { v: StatusFilter; label: string }[] = [
  { v: "todos", label: "Todos" },
  { v: "rascunho", label: "Rascunho" },
  { v: "enviada", label: "Enviado" },
  { v: "convertida", label: "Aceito" },
  { v: "recusada", label: "Recusado" },
  { v: "expirada", label: "Expirado" },
];

export default function Orcamentos() {
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [status, setStatus] = usePersistedState<StatusFilter>(
    "orcamentos:status",
    "todos"
  );
  const [search, setSearch] = usePersistedState("orcamentos:search", "");
  const [origin, setOrigin] = usePersistedState<ProposalOrigin>(
    "orcamentos:origin",
    "all"
  );
  const [viewMode, setViewMode] = usePersistedState<ViewMode>(
    "orcamentos.viewMode",
    "kanban"
  );
  const [novoOpen, setNovoOpen] = useState(false);

  // No Kanban ignoramos o filtro de status (Kanban mostra tudo, dividido por coluna).
  // O filtro só age na tabela.
  const effStatus: StatusFilter = viewMode === "kanban" ? "todos" : status;
  const { data = [], isLoading } = useProposals({ status: effStatus, search, origin });
  const update = useUpdateProposal();
  const del = useDeleteProposal();
  const dup = useDuplicateProposal();
  const gen = useGenerateProposalPDF();

  const isEmpty = useMemo(() => !isLoading && data.length === 0, [
    isLoading,
    data,
  ]);

  async function handleAction(row: any, action: string) {
    if (action === "edit") {
      navigate(`/financeiro/orcamentos/${row.id}/editar`);
      return;
    }
    if (action === "duplicate") {
      dup.mutate(row.id, {
        onSuccess: (newId) => {
          toast.success("Proposta duplicada");
          navigate(`/financeiro/orcamentos/${newId}/editar`);
        },
      });
      return;
    }
    if (action === "download") {
      gen.mutate({
        proposalId: row.id,
        proposal: row,
        templateKey: row.template_key,
        triggerDownload: true,
      });
      return;
    }
    if (action === "mark-sent") {
      update.mutate(
        {
          id: row.id,
          payload: {
            status: "enviada",
            sent_at: new Date().toISOString(),
          },
        },
        { onSuccess: () => toast.success("Marcado como enviado") }
      );
      return;
    }
    if (action === "mark-accepted") {
      update.mutate(
        {
          id: row.id,
          payload: {
            status: "convertida",
            accepted_at: new Date().toISOString(),
          },
        },
        { onSuccess: () => toast.success("Proposta aceita") }
      );
      return;
    }
    if (action === "mark-rejected") {
      update.mutate(
        {
          id: row.id,
          payload: {
            status: "recusada",
            rejected_at: new Date().toISOString(),
          },
        },
        { onSuccess: () => toast.success("Proposta marcada como recusada") }
      );
      return;
    }
    if (action === "delete") {
      const ok = await confirm({
        title: "Excluir orçamento?",
        description: `O orçamento ${row.code} será movido para a lixeira.`,
        confirmLabel: "Excluir",
        variant: "destructive",
      });
      if (ok) del.mutate(row.id, { onSuccess: () => toast.success("Excluído") });
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Propostas</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Crie, edite e gere PDFs de propostas comerciais
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="border border-border rounded-md p-0.5 flex-1 md:flex-none"
          >
            <ToggleGroupItem value="kanban" size="sm" aria-label="Visão Kanban" className="flex-1 md:flex-none h-9">
              <LayoutGrid className="h-4 w-4" /> <span className="hidden sm:inline">Kanban</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="table" size="sm" aria-label="Visão Tabela" className="flex-1 md:flex-none h-9">
              <Table2 className="h-4 w-4" /> <span className="hidden sm:inline">Tabela</span>
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={() => setNovoOpen(true)} className="h-10 md:h-9 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Proposta</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </header>

      <OrcamentoKPICards />

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
        {viewMode === "table" ? (
          <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)} className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
            <TabsList className="w-max">
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t.v} value={t.v} className="whitespace-nowrap">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <div />
        )}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:ml-auto">
          {viewMode === "table" && (
            <ToggleGroup
              type="single"
              value={origin}
              onValueChange={(v) => v && setOrigin(v as ProposalOrigin)}
              className="border border-border rounded-md p-0.5"
            >
              <ToggleGroupItem value="all" size="sm" className="h-9 px-3 text-xs">Todas</ToggleGroupItem>
              <ToggleGroupItem value="deal" size="sm" className="h-9 px-3 text-xs">Do deal</ToggleGroupItem>
              <ToggleGroupItem value="manual" size="sm" className="h-9 px-3 text-xs">Manual</ToggleGroupItem>
            </ToggleGroup>
          )}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Código ou cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 md:h-9"
            />
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold">Nenhum orçamento ainda</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crie sua primeira proposta para começar.
          </p>
          <Button onClick={() => setNovoOpen(true)}>
            <Plus className="h-4 w-4" /> Criar primeiro orçamento
          </Button>
        </div>
      ) : viewMode === "kanban" ? (
        <OrcamentoKanban
          rows={data}
          onCardClick={(r) => navigate(`/financeiro/orcamentos/${r.id}/editar`)}
        />
      ) : (
        <OrcamentoTabela
          rows={data}
          loading={isLoading}
          onAction={handleAction}
          onRowClick={(r) => navigate(`/financeiro/orcamentos/${r.id}/editar`)}
        />
      )}

      <NovoOrcamentoModal open={novoOpen} onOpenChange={setNovoOpen} />
      {confirmDialog}
    </div>
  );
}
