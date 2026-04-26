import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecurrenceDetail } from "@/hooks/recorrencias/useRecurrenceDetail";
import { useUpdateRecurrenceStatus } from "@/hooks/recorrencias/useUpdateRecurrence";
import { EditarRecorrenciaModal } from "@/components/recorrencias/EditarRecorrenciaModal";
import { AcaoCascataConfirm } from "@/components/recorrencias/AcaoCascataConfirm";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { FREQ_LABEL, type Frequency } from "@/lib/recorrencias/preview";
import { StatusBadge } from "@/components/StatusBadge";

const STATUS_STYLE: Record<string, string> = {
  ativa: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  pausada: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  encerrada: "bg-muted text-muted-foreground border-border",
  cancelada: "bg-destructive/15 text-destructive border-destructive/30",
};

const ACTION_TEXT: Record<string, { title: string; description: string; status: string; confirm: string; destructive?: boolean }> = {
  pause: { title: "Pausar", status: "pausada", confirm: "Pausar",
    description: "Pausar impede a geração de novas parcelas. As já criadas permanecem inalteradas. Você pode reativar a qualquer momento." },
  resume: { title: "Reativar", status: "ativa", confirm: "Reativar",
    description: "Reativar retoma a geração de parcelas no horizonte de 12 meses." },
  end: { title: "Encerrar", status: "encerrada", confirm: "Encerrar", destructive: true,
    description: "Encerrar marca como concluída naturalmente. Parcelas pendentes futuras serão removidas; pagas/vencidas permanecem." },
  cancel: { title: "Cancelar", status: "cancelada", confirm: "Cancelar recorrência", destructive: true,
    description: "Cancelar interrompe a série. Parcelas pendentes futuras serão removidas; pagas/vencidas permanecem." },
};

export default function RecorrenciaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useRecurrenceDetail(id);
  const statusMut = useUpdateRecurrenceStatus();

  const [editOpen, setEditOpen] = useState(false);
  const [actionKey, setActionKey] = useState<keyof typeof ACTION_TEXT | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  if (isLoading) {
    return <div className="space-y-4 max-w-6xl mx-auto"><Skeleton className="h-10 w-64" /><Skeleton className="h-32 w-full" /></div>;
  }
  if (!data) return null;

  const r = data.recurrence;
  const installments = data.installments.filter((m: any) => showDeleted || !m.deleted_at);
  const pagas = installments.filter((m: any) => m.status === "pago").length;
  const abertas = installments.filter((m: any) => m.status === "pendente").length;
  const today = new Date().toISOString().slice(0, 10);
  const vencidas = installments.filter((m: any) => m.status === "pendente" && m.data_vencimento < today).length;
  const nextDue = installments
    .filter((m: any) => m.status === "pendente")
    .map((m: any) => m.data_vencimento)
    .sort()[0];
  const totalSerie = r.type === "installment"
    ? Number(r.amount) * Number(r.total_installments || 0)
    : Number(r.amount) * 12;

  const isActionable = r.status === "ativa" || r.status === "pausada";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/financeiro/recorrencias")}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Recorrências
      </Button>

      {/* Header denso */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">{r.code}</span>
            <h1 className="text-2xl font-bold">{r.description}</h1>
            <Badge variant="outline" className={STATUS_STYLE[r.status]}>{r.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {r.type === "recurrence" ? "Recorrência contínua" : "Parcelamento finito"} • {r.direction === "receita" ? "Receita" : "Despesa"} • {FREQ_LABEL[r.frequency as Frequency] ?? r.frequency}
            {r.end_date && ` • até ${formatDate(r.end_date)}`}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiSimple label="Valor" value={formatCurrency(Number(r.amount))} />
        <KpiSimple label="Próximo vencimento" value={nextDue ? formatDate(nextDue) : "—"} />
        <KpiSimple
          label="Parcelas"
          value={`${pagas} pagas`}
          hint={`${abertas} abertas${vencidas ? ` • ${vencidas} vencidas` : ""}`}
        />
        <KpiSimple label={r.type === "installment" ? "Total da série" : "Total anual estimado"} value={formatCurrency(totalSerie)} />
      </div>

      {/* Ações */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-2">
          {r.status === "ativa" && (
            <Button variant="outline" size="sm" onClick={() => setActionKey("pause")}>Pausar</Button>
          )}
          {r.status === "pausada" && (
            <Button variant="outline" size="sm" onClick={() => setActionKey("resume")}>Reativar</Button>
          )}
          {isActionable && (
            <>
              <Button variant="outline" size="sm" onClick={() => setActionKey("end")}>Encerrar</Button>
              <Button variant="outline" size="sm" onClick={() => setActionKey("cancel")} className="text-destructive hover:text-destructive">Cancelar</Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>Editar</Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="parcelas">
        <TabsList>
          <TabsTrigger value="parcelas">Parcelas ({installments.length})</TabsTrigger>
          <TabsTrigger value="vinculos">Vínculos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="parcelas" className="space-y-3">
          <div className="flex justify-end items-center gap-2">
            <Switch id="show-del" checked={showDeleted} onCheckedChange={setShowDeleted} />
            <Label htmlFor="show-del" className="text-xs cursor-pointer">Mostrar removidas</Label>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>#</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Previsto</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nenhuma parcela</TableCell></TableRow>
                )}
                {installments.map((m: any) => (
                  <TableRow key={m.id} className={m.deleted_at ? "opacity-50" : ""}>
                    <TableCell className="font-mono text-xs">{m.installment_number ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{formatDate(m.data_vencimento)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(Number(m.valor_previsto))}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.valor_realizado ? formatCurrency(Number(m.valor_realizado)) : "—"}</TableCell>
                    <TableCell><StatusBadge status={m.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/financeiro/movimentacoes/${m.id}`)}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="vinculos">
          <Card>
            <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
              <Vinc label="Cliente" value={r.cliente?.nome} />
              <Vinc label="Fornecedor" value={r.fornecedor?.nome} />
              <Vinc label="Projeto" value={r.projeto ? `${r.projeto.code} — ${r.projeto.name}` : null} />
              <Vinc label="Categoria" value={r.categoria?.nome} />
              <Vinc label="Centro de custo" value={r.centro_custo?.nome} />
              <Vinc label="Conta bancária" value={r.conta_bancaria?.nome} />
              <Vinc label="Meio de pagamento" value={r.meio_pagamento?.nome} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground text-center">
              Histórico de mudanças será exibido após a implementação completa do módulo de auditoria (DT-09C1A-1).
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditarRecorrenciaModal open={editOpen} onOpenChange={setEditOpen} recurrence={r} />

      {actionKey && (
        <AcaoCascataConfirm
          open={!!actionKey}
          onOpenChange={(v) => !v && setActionKey(null)}
          title={ACTION_TEXT[actionKey].title}
          description={ACTION_TEXT[actionKey].description}
          confirmLabel={ACTION_TEXT[actionKey].confirm}
          destructive={ACTION_TEXT[actionKey].destructive}
          onConfirm={async () => { await statusMut.mutateAsync({ id: r.id, status: ACTION_TEXT[actionKey].status }); }}
        />
      )}
    </div>
  );
}

function KpiSimple({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-bold mt-1 tabular-nums">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function Vinc({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}
