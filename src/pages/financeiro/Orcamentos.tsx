import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { NovoOrcamentoModal } from "@/components/orcamentos/NovoOrcamentoModal";
import { ProposalPDFTemplate } from "@/components/orcamentos/ProposalPDFTemplate";
import type { ProposalStatus } from "@/lib/orcamentos/calculateTotal";
import { useConfirm } from "@/components/ConfirmDialog";
import { toast } from "sonner";

type StatusFilter = "todos" | ProposalStatus;

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
  const [novoOpen, setNovoOpen] = useState(false);
  const [pdfRow, setPdfRow] = useState<any | null>(null);

  const { data = [], isLoading } = useProposals({ status, search });
  const update = useUpdateProposal();
  const del = useDeleteProposal();
  const dup = useDuplicateProposal();
  const gen = useGeneratePDF();

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
          toast.success("Orçamento duplicado");
          navigate(`/financeiro/orcamentos/${newId}/editar`);
        },
      });
      return;
    }
    if (action === "download") {
      // Renderiza off-screen e gera PDF
      setPdfRow(row);
      // aguarda render
      await new Promise((r) => setTimeout(r, 50));
      gen.mutate({
        proposalId: row.id,
        code: row.code,
        clientName: row.client_company_name,
        elementId: `pdf-list-${row.id}`,
      }, { onSettled: () => setPdfRow(null) });
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
        <Button onClick={() => setNovoOpen(true)}>
          <Plus className="h-4 w-4" /> Novo Orçamento
        </Button>
      </header>

      <OrcamentoKPICards />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList>
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.v} value={t.v}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
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
      ) : (
        <OrcamentoTabela
          rows={data}
          loading={isLoading}
          onAction={handleAction}
        />
      )}

      <NovoOrcamentoModal open={novoOpen} onOpenChange={setNovoOpen} />
      {confirmDialog}

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
            }}
          />
        </div>
      )}
    </div>
  );
}
