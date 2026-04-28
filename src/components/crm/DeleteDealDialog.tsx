import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  FileText,
  Briefcase,
  UserCheck,
  Activity,
  ListChecks,
  Wrench,
  Receipt,
  RefreshCw,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDealDeletionImpact } from "@/hooks/crm/useDealDeletionImpact";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dealId: string;
  dealCode: string;
  dealTitle: string;
  onConfirm: () => Promise<void>;
}

function Row({
  icon: Icon,
  label,
  detail,
  to,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail?: string;
  to?: string;
  tone?: "default" | "danger" | "warning";
}) {
  const toneCls =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
      ? "text-amber-500"
      : "text-foreground";
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-background/50 px-3 py-2">
      <div className="flex items-start gap-2.5 min-w-0">
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", toneCls)} />
        <div className="min-w-0">
          <div className={cn("text-sm font-medium", toneCls)}>{label}</div>
          {detail && <div className="text-xs text-muted-foreground mt-0.5">{detail}</div>}
        </div>
      </div>
      {to && (
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1 shrink-0">
          <Link to={to} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Abrir</span>
          </Link>
        </Button>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-3 mb-1.5">
      {children}
    </div>
  );
}

export function DeleteDealDialog({
  open,
  onOpenChange,
  dealId,
  dealCode,
  dealTitle,
  onConfirm,
}: Props) {
  const { data: impact, isLoading } = useDealDeletionImpact(open ? dealId : null);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmText("");
      setSubmitting(false);
    }
  }, [open]);

  const hasProjectBlock = !!impact?.project;
  const canDelete = !hasProjectBlock && confirmText.trim().toUpperCase() === "EXCLUIR";

  const handleConfirm = async () => {
    if (!canDelete) return;
    try {
      setSubmitting(true);
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir deal {dealCode}?
          </DialogTitle>
          <DialogDescription className="text-foreground">
            <strong>{dealTitle}</strong> — Esta ação <strong>não pode ser desfeita</strong>.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !impact ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="space-y-1">
            {/* BLOQUEIOS */}
            {hasProjectBlock && (
              <>
                <SectionTitle>⛔ Bloqueia a exclusão</SectionTitle>
                <Row
                  icon={Briefcase}
                  label={`Projeto vinculado: ${impact.project!.code}`}
                  detail="Este deal já foi convertido em projeto. Exclua ou arquive o projeto primeiro — todos os contratos, contas e recorrências dele também serão removidos."
                  to={`/projetos/${impact.project!.id}`}
                  tone="danger"
                />
                {impact.projectImpact && (
                  <div className="ml-6 mt-1 space-y-1">
                    {impact.projectImpact.maintenanceContracts > 0 && (
                      <Row
                        icon={Wrench}
                        label={`${impact.projectImpact.maintenanceContracts} contrato(s) de manutenção`}
                        detail="Vinculado(s) ao projeto"
                        tone="warning"
                      />
                    )}
                    {impact.projectImpact.movimentacoesPendentes > 0 && (
                      <Row
                        icon={Receipt}
                        label={`${impact.projectImpact.movimentacoesPendentes} conta(s) pendente(s)`}
                        detail="Contas a pagar/receber em aberto vinculadas ao projeto"
                        tone="warning"
                      />
                    )}
                    {impact.projectImpact.movimentacoesPagas > 0 && (
                      <Row
                        icon={Receipt}
                        label={`${impact.projectImpact.movimentacoesPagas} conta(s) já liquidada(s)`}
                        detail="Histórico financeiro do projeto"
                        tone="warning"
                      />
                    )}
                    {impact.projectImpact.recurrencesActive > 0 && (
                      <Row
                        icon={RefreshCw}
                        label={`${impact.projectImpact.recurrencesActive} recorrência(s) ativa(s)`}
                        detail="Continuam gerando movimentações"
                        tone="warning"
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* DESVINCULAÇÃO */}
            {(impact.proposals.length > 0 || impact.originLead) && (
              <>
                <SectionTitle>🔗 Será desvinculado</SectionTitle>
                {impact.proposals.map((p) => (
                  <Row
                    key={p.id}
                    icon={FileText}
                    label={`Proposta ${p.code}`}
                    detail="Continua existindo, mas vira proposta avulsa"
                    to={`/financeiro/orcamentos/${p.id}`}
                  />
                ))}
                {impact.originLead && (
                  <Row
                    icon={UserCheck}
                    label={`Lead de origem: ${impact.originLead.code}`}
                    detail='Volta para o status "novo" no funil de leads'
                    to={`/crm/leads/${impact.originLead.code}`}
                  />
                )}
              </>
            )}

            {/* CASCATA */}
            {(impact.activitiesCount > 0 || impact.dependenciesCount > 0) && (
              <>
                <SectionTitle>🗑 Será removido em cascata</SectionTitle>
                {impact.activitiesCount > 0 && (
                  <Row
                    icon={Activity}
                    label={`${impact.activitiesCount} atividade(s)`}
                    detail="Reuniões, ligações e tarefas vinculadas ao deal"
                  />
                )}
                {impact.dependenciesCount > 0 && (
                  <Row
                    icon={ListChecks}
                    label={`${impact.dependenciesCount} dependência(s)`}
                    detail="Itens combinados com o cliente"
                  />
                )}
              </>
            )}

            {/* SEM IMPACTO */}
            {!hasProjectBlock &&
              impact.proposals.length === 0 &&
              !impact.originLead &&
              impact.activitiesCount === 0 &&
              impact.dependenciesCount === 0 && (
                <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-4 text-sm text-muted-foreground text-center">
                  Nenhuma dependência detectada — o deal pode ser excluído com segurança.
                </div>
              )}

            {/* CONFIRMAÇÃO POR TEXTO */}
            {!hasProjectBlock && (
              <div className="mt-4 space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <Label htmlFor="confirm-delete" className="text-xs">
                  Digite <strong className="text-destructive">EXCLUIR</strong> para confirmar:
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  autoComplete="off"
                  disabled={submitting}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canDelete || submitting || isLoading}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {hasProjectBlock ? "Resolva os bloqueios primeiro" : "Excluir definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Bloco de "Zona de risco" reutilizável para o detalhe do deal — apenas
// dispara o dialog acima.
export function DealDangerZoneTrigger({
  onOpen,
  loading,
}: {
  onOpen: () => void;
  loading?: boolean;
}) {
  // Reutilizamos o mesmo visual do DangerZone padrão — sem o useConfirm,
  // pois o fluxo do deal usa o DeleteDealDialog rico.
  return (
    <div className="mt-8 rounded-lg border border-destructive/40 bg-destructive/5 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="font-semibold text-destructive">Zona de risco</div>
          <p className="text-sm text-muted-foreground">
            Excluir este deal remove permanentemente o registro. Você verá uma
            prévia de tudo que será afetado antes de confirmar.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground sm:w-auto"
          onClick={onOpen}
          disabled={loading}
        >
          <AlertTriangle className="h-4 w-4" />
          Excluir deal
        </Button>
      </div>
    </div>
  );
}

// Reexport pra tipagem correta sem warning de unused
export type { Props as DeleteDealDialogProps };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _navHint = useNavigate;
