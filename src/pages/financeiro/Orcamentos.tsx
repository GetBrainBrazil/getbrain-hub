import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, LayoutGrid, Table2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNavigate } from "react-router-dom";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useProposals } from "@/hooks/orcamentos/useProposals";
import {
  useDeleteProposal,
  useDuplicateProposal,
  useUpdateProposal,
} from "@/hooks/orcamentos/useUpdateProposal";
import { useGeneratePDF } from "@/hooks/orcamentos/useGeneratePDF";
import { OrcamentoKPICards } from "@/components/orcamentos/OrcamentoKPICards";
import { OrcamentoTabela } from "@/components/orcamentos/OrcamentoTabela";
import { OrcamentoKanban } from "@/components/orcamentos/OrcamentoKanban";
import { OrcamentoDrawer } from "@/components/orcamentos/OrcamentoDrawer";
import { NovoOrcamentoModal } from "@/components/orcamentos/NovoOrcamentoModal";
import { ProposalPDFTemplate } from "@/components/orcamentos/ProposalPDFTemplate";
import type { ProposalStatus } from "@/lib/orcamentos/calculateTotal";
import { useConfirm } from "@/components/ConfirmDialog";
import { toast } from "sonner";

type StatusFilter = "todos" | ProposalStatus;
type ViewMode = "kanban" | "table";

const STATUS_TABS: { v: StatusFilter; label: string }[] = [
  { v: "todos", label: "Todos" },
  { v: "rascunho", label: "Rascunho" },
  { v: "enviado", label: "Enviado" },
  { v: "aceito", label: "Aceito" },
  { v: "recusado", label: "Recusado" },
  { v: "expirado", label: "Expirado" },
];

export default function Orcamentos() {
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [status, setStatus] = usePersistedState<StatusFilter>(
    "orcamentos:status",
    "todos"
  );
  const [search, setSearch] = usePersistedState("orcamentos:search", "");
  const [viewMode, setViewMode] = usePersistedState<ViewMode>(
    "orcamentos.viewMode",
    "kanban"
  );
  const [novoOpen, setNovoOpen] = useState(false);
  const [pdfRow, setPdfRow] = useState<any | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  // No Kanban ignoramos o filtro de status (Kanban mostra tudo, dividido por coluna).
  // O filtro só age na tabela.
  const effStatus: StatusFilter = viewMode === "kanban" ? "todos" : status;
  const { data = [], isLoading } = useProposals({ status: effStatus, search });
  const update = useUpdateProposal();
  const del = useDeleteProposal();
  const dup = useDuplicateProposal();
  const gen = useGeneratePDF();

  const isEmpty = useMemo(() => !isLoading && data.length === 0, [
    isLoading,
    data,
  ]);

  function buildSnapshot(row: any) {
    return {
      client_company_name: row.client_company_name,
      client_logo_url: row.client_logo_url,
      client_city: row.client_city,
      scope_items: row.scope_items,
      maintenance_monthly_value: row.maintenance_monthly_value,
      maintenance_description: row.maintenance_description ?? null,
      implementation_days: row.implementation_days ?? 30,
      validation_days: row.validation_days ?? 7,
      considerations: row.considerations || [],
      valid_until: row.valid_until,
      template_key: row.template_key || "inovacao_tecnologica",
    };
  }

  async function handleAction(row: any, action: string) {
    if (action === "edit") {
      navigate(`/financeiro/orcamentos/${row.id}/editar`);
      return;
    }
    if (action === "duplicate") {
      dup.mutate(row.id, {
        onSuccess: (newId) => {
          toast.success("Orçamento duplicado");
          navigate(`/financeiro/orcamentos/${newId}/editar`);
        },
      });
      return;
    }
    if (action === "download") {
      setPdfRow(row);
      await new Promise((r) => setTimeout(r, 50));
      gen.mutate(
        {
          proposalId: row.id,
          code: row.code,
          clientName: row.client_company_name,
          elementId: `pdf-list-${row.id}`,
          snapshot: buildSnapshot(row),
        },
        { onSettled: () => setPdfRow(null) }
      );
      return;
    }
    if (action === "mark-sent") {
      update.mutate(
        {
          id: row.id,
          payload: {
            status: "enviado",
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
            status: "aceito",
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
            status: "recusado",
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
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">
            Crie, edite e gere PDFs de propostas comerciais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="border border-border rounded-md p-0.5"
          >
            <ToggleGroupItem value="kanban" size="sm" aria-label="Visão Kanban">
              <LayoutGrid className="h-4 w-4" /> Kanban
            </ToggleGroupItem>
            <ToggleGroupItem value="table" size="sm" aria-label="Visão Tabela">
              <Table2 className="h-4 w-4" /> Tabela
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={() => setNovoOpen(true)}>
            <Plus className="h-4 w-4" /> Novo Orçamento
          </Button>
        </div>
      </header>

      <OrcamentoKPICards />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {viewMode === "table" ? (
          <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <TabsList>
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t.v} value={t.v}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <div />
        )}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Código ou cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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
          onCardClick={(r) => setDrawerId(r.id)}
        />
      ) : (
        <OrcamentoTabela
          rows={data}
          loading={isLoading}
          onAction={handleAction}
          onRowClick={(r) => setDrawerId(r.id)}
        />
      )}

      <NovoOrcamentoModal open={novoOpen} onOpenChange={setNovoOpen} />
      {confirmDialog}

      <OrcamentoDrawer
        proposalId={drawerId}
        onClose={() => setDrawerId(null)}
      />

      {/* Render off-screen template for PDF generation */}
      {pdfRow && (
        <div
          style={{
            position: "fixed",
            left: "-99999px",
            top: 0,
            pointerEvents: "none",
          }}
        >
          <ProposalPDFTemplate
            domId={`pdf-list-${pdfRow.id}`}
            proposal={{
              client_company_name: pdfRow.client_company_name,
              client_logo_url: pdfRow.client_logo_url,
              scope_items: pdfRow.scope_items || [],
              maintenance_monthly_value: pdfRow.maintenance_monthly_value,
              maintenance_description: pdfRow.maintenance_description ?? null,
              implementation_days: pdfRow.implementation_days ?? 30,
              validation_days: pdfRow.validation_days ?? 7,
              considerations: pdfRow.considerations || [],
              valid_until: pdfRow.valid_until,
              template_key: pdfRow.template_key,
            }}
          />
        </div>
      )}
    </div>
  );
}
