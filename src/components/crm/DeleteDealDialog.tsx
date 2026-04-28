import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  /** Recebe o modo escolhido pelo usuário (safe ou cascade). */
  onConfirm: (mode: 'safe' | 'cascade') => Promise<void>;
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
  const [mode, setMode] = useState<'safe' | 'cascade'>('safe');

  useEffect(() => {
    if (!open) {
      setConfirmText("");
      setSubmitting(false);
      setMode('safe');
    }
  }, [open]);

  const hasProjectBlock = !!impact?.project;
  // No modo cascade, exigimos confirmação SEMPRE. No safe, só quando há algo a perder.
  const expectedWord = mode === 'cascade' ? 'EXCLUIR TUDO' : 'EXCLUIR';
  const needsTypeConfirm = mode === 'cascade' || !hasProjectBlock;
  const typeOk = confirmText.trim().toUpperCase() === expectedWord;
  const canDelete =
    (mode === 'cascade' || !hasProjectBlock) && typeOk;

  const handleConfirm = async () => {
    if (!canDelete) return;
    try {
      setSubmitting(true);
      await onConfirm(mode);
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
            {/* SELETOR DE MODO — sempre visível quando há QUALQUER dependência,
                para que o usuário possa optar por desvincular (safe) ou apagar
                tudo em cascata (proposta, atividades, dependências, projeto). */}
            {(hasProjectBlock ||
              impact.proposals.length > 0 ||
              impact.activitiesCount > 0 ||
              impact.dependenciesCount > 0) && (
              <>
                <SectionTitle>Modo de exclusão</SectionTitle>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => { setMode('safe'); setConfirmText(''); }}
                    className={cn(
                      'rounded-md border p-3 text-left transition-colors',
                      mode === 'safe'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/40',
                    )}
                  >
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Seguro
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {hasProjectBlock
                        ? 'Bloqueado: você precisa apagar o projeto antes.'
                        : 'Apaga só o deal. Propostas viram avulsas, lead volta para "novo".'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('cascade'); setConfirmText(''); }}
                    className={cn(
                      'rounded-md border p-3 text-left transition-colors',
                      mode === 'cascade'
                        ? 'border-destructive bg-destructive/10 ring-2 ring-destructive/40'
                        : 'border-border hover:border-destructive/40',
                    )}
                  >
                    <div className="text-sm font-semibold flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Em cascata
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Apaga o deal e tudo que está pendurado nele (propostas, projeto, financeiro).
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* PROJETO VINCULADO + IMPACTO */}
            {hasProjectBlock && (
              <>
                <SectionTitle>
                  {mode === 'cascade' ? '🔥 Será apagado em cascata' : '⛔ Bloqueia a exclusão'}
                </SectionTitle>
                <Row
                  icon={Briefcase}
                  label={`Projeto vinculado: ${impact.project!.code}`}
                  detail={
                    mode === 'cascade'
                      ? 'O projeto inteiro será removido — incluindo marcos, riscos, atores, integrações e dependências.'
                      : 'Este deal já foi convertido em projeto. Mude para "Em cascata" ou apague o projeto manualmente.'
                  }
                  to={`/projetos/${impact.project!.id}`}
                  tone="danger"
                />
                {impact.projectImpact && (
                  <div className="ml-6 mt-1 space-y-1">
                    {impact.projectImpact.maintenanceContracts > 0 && (
                      <Row
                        icon={Wrench}
                        label={`${impact.projectImpact.maintenanceContracts} contrato(s) de manutenção`}
                        detail={mode === 'cascade' ? 'Serão apagados' : 'Vinculado(s) ao projeto'}
                        tone={mode === 'cascade' ? 'danger' : 'warning'}
                      />
                    )}
                    {impact.projectImpact.movimentacoesPendentes > 0 && (
                      <Row
                        icon={Receipt}
                        label={`${impact.projectImpact.movimentacoesPendentes} conta(s) pendente(s)`}
                        detail={mode === 'cascade' ? 'Serão apagadas do contas a pagar/receber' : 'Em aberto vinculadas ao projeto'}
                        tone={mode === 'cascade' ? 'danger' : 'warning'}
                      />
                    )}
                    {impact.projectImpact.movimentacoesPagas > 0 && (
                      <Row
                        icon={Receipt}
                        label={`${impact.projectImpact.movimentacoesPagas} conta(s) já liquidada(s)`}
                        detail={mode === 'cascade' ? 'Histórico financeiro será apagado' : 'Histórico financeiro do projeto'}
                        tone={mode === 'cascade' ? 'danger' : 'warning'}
                      />
                    )}
                    {impact.projectImpact.recurrencesActive > 0 && (
                      <Row
                        icon={RefreshCw}
                        label={`${impact.projectImpact.recurrencesActive} recorrência(s) ativa(s)`}
                        detail={mode === 'cascade' ? 'Serão apagadas (param de gerar)' : 'Continuam gerando movimentações'}
                        tone={mode === 'cascade' ? 'danger' : 'warning'}
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* PROPOSTAS / LEAD */}
            {(impact.proposals.length > 0 || impact.originLead) && (
              <>
                <SectionTitle>
                  {mode === 'cascade' && impact.proposals.length > 0
                    ? '🔥 Propostas serão apagadas'
                    : '🔗 Será desvinculado'}
                </SectionTitle>
                {impact.proposals.map((p) => (
                  <Row
                    key={p.id}
                    icon={FileText}
                    label={`Proposta ${p.code}`}
                    detail={mode === 'cascade' ? 'Será apagada definitivamente' : 'Continua existindo, mas vira proposta avulsa'}
                    to={`/financeiro/orcamentos/${p.id}`}
                    tone={mode === 'cascade' ? 'danger' : 'default'}
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

            {/* CASCATA DO DEAL */}
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
            {needsTypeConfirm && (
              <div
                className={cn(
                  'mt-4 space-y-2 rounded-md border p-3',
                  mode === 'cascade'
                    ? 'border-destructive bg-destructive/10'
                    : 'border-destructive/40 bg-destructive/5',
                )}
              >
                <Label htmlFor="confirm-delete" className="text-xs">
                  Digite <strong className="text-destructive">{expectedWord}</strong> para confirmar:
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={expectedWord}
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
            {hasProjectBlock && mode === 'safe'
              ? 'Selecione "Em cascata" para prosseguir'
              : mode === 'cascade'
              ? 'Excluir tudo em cascata'
              : 'Excluir definitivamente'}
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

export type { Props as DeleteDealDialogProps };
