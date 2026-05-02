import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ActivityPanel } from '@/components/crm/ActivityPanel';
import { DetailBreadcrumb, DetailShell } from '@/components/crm/CrmDetailShared';
import { DangerZone } from '@/components/crm/DangerZone';
import { ZoneSection } from '@/components/crm/ZoneSection';
import { ChipGroup, FieldLabel, InlineMoney, InlineInteger, InlineText } from '@/components/crm/inlineFields';
import { LeadHeader } from '@/components/crm/LeadHeader';
import { LeadSidebar } from '@/components/crm/LeadSidebar';
import { ConvertLeadDialog } from '@/components/crm/ConvertLeadDialog';
import { PainCategoriesMultiSelect } from '@/components/crm/PainCategoriesMultiSelect';
import { useActivitiesForEntity, useEntityAudit, useLeadByCode, useUpdateLeadField } from '@/hooks/crm/useCrmDetails';
import { useDeleteLead } from '@/hooks/crm/useLeads';
import { invalidateCrmCaches } from '@/lib/cacheInvalidation';
import type { Lead, LeadFit, LeadUrgency } from '@/types/crm';

const URGENCY_OPTIONS: LeadUrgency[] = ['baixa', 'media', 'alta', 'critica'];
const URGENCY_LABEL: Record<LeadUrgency, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica',
};
const URGENCY_COLOR: Partial<Record<LeadUrgency, string>> = {
  baixa: 'bg-muted/40 text-foreground border-border',
  media: 'bg-warning/15 text-warning border-warning/40',
  alta: 'bg-destructive/15 text-destructive border-destructive/40',
  critica: 'bg-destructive/30 text-destructive border-destructive',
};

const FIT_OPTIONS: LeadFit[] = ['bom', 'medio', 'ruim'];
const FIT_LABEL: Record<LeadFit, string> = { bom: 'Bom', medio: 'Médio', ruim: 'Ruim' };
const FIT_COLOR: Partial<Record<LeadFit, string>> = {
  bom: 'bg-success/15 text-success border-success/40',
  medio: 'bg-warning/15 text-warning border-warning/40',
  ruim: 'bg-destructive/15 text-destructive border-destructive/40',
};

const TRIAGEM_CHANNELS = ['Google Meet', 'Zoom', 'WhatsApp', 'Telefone', 'Presencial', 'Outro'] as const;

function MiniTimeline({ rows }: { rows: { id: string; created_at: string; action: string }[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nenhum evento registrado.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <article key={r.id} className="rounded-lg border border-border bg-card/40 p-4 text-sm">
          <p>{r.action}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(r.created_at).toLocaleString('pt-BR')}
          </p>
        </article>
      ))}
    </div>
  );
}

export default function CrmLeadDetail() {
  const { code } = useParams<{ code: string }>();
  const { data: lead, isLoading } = useLeadByCode(code);
  const { data: activities = [] } = useActivitiesForEntity('lead', lead?.id);
  const { data: audit = [] } = useEntityAudit('lead', lead?.id);
  const update = useUpdateLeadField(code);

  const [convertOpen, setConvertOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [reason, setReason] = useState('');

  const save = (updates: Partial<Lead>) => {
    if (!lead) return;
    update.mutate(
      { id: lead.id, updates },
      { onError: (err: any) => toast.error(`Erro ao salvar: ${err?.message ?? 'tente novamente'}`) },
    );
  };

  if (isLoading) {
    return (
      <DetailShell>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-40 w-full" />
      </DetailShell>
    );
  }

  if (!lead) {
    return (
      <DetailShell>
        <div className="py-20 text-center">
          <h1 className="text-2xl font-semibold">Lead não encontrado</h1>
          <Button asChild className="mt-4">
            <Link to="/crm/leads">Voltar</Link>
          </Button>
        </div>
      </DetailShell>
    );
  }

  const canConvert = lead.status === 'triagem_feita';

  return (
    <DetailShell>
      <DetailBreadcrumb
        closeTo="/crm/leads"
        items={[
          { label: 'CRM', to: '/crm/pipeline' },
          { label: 'Leads', to: '/crm/leads' },
          { label: lead.code },
        ]}
      />

      <LeadHeader
        lead={lead}
        onConvert={() => {
          if (!canConvert) {
            toast.info('Marque a triagem como feita antes de converter.');
            return;
          }
          setConvertOpen(true);
        }}
        onScheduleTriagem={() => save({ status: 'triagem_agendada' })}
        onMarkTriagemDone={() =>
          save({
            status: 'triagem_feita',
            triagem_happened_at: lead.triagem_happened_at ?? new Date().toISOString(),
          })
        }
        onDiscard={() => setDiscardOpen(true)}
        onReopen={() => save({ status: 'novo', lost_reason: null })}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0">
          {/* Botão sidebar mobile */}
          <div className="mb-3 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Menu className="mr-2 h-4 w-4" /> Detalhes do lead
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
                <LeadSidebar lead={lead} save={save} />
              </SheetContent>
            </Sheet>
          </div>

          <Tabs defaultValue="details">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="activities">Atividades</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-5 space-y-5">
              {/* 01 — Qualificação */}
              <ZoneSection number={1} title="Qualificação" hint="Quão urgente e quão bem encaixa?">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel hint="quanto tempo até virar problema?">Urgência</FieldLabel>
                    <ChipGroup<LeadUrgency>
                      options={URGENCY_OPTIONS}
                      value={lead.urgency}
                      onChange={(v) => save({ urgency: v })}
                      labels={URGENCY_LABEL}
                      colors={URGENCY_COLOR}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel hint="match com o nosso jeito de entregar">Fit</FieldLabel>
                    <ChipGroup<LeadFit>
                      options={FIT_OPTIONS}
                      value={lead.fit}
                      onChange={(v) => save({ fit: v })}
                      labels={FIT_LABEL}
                      colors={FIT_COLOR}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabel hint="setor, porte, cenário do mercado, etapa de maturidade">
                    Contexto de negócio
                  </FieldLabel>
                  <InlineText
                    value={lead.business_context}
                    onSave={(v) => save({ business_context: v })}
                    placeholder="O que você sabe sobre essa empresa, mercado e momento dela?"
                    multiline
                    minHeight={100}
                  />
                </div>
              </ZoneSection>

              {/* 02 — Dor & Contexto */}
              <ZoneSection number={2} title="Dor & Contexto" hint="O problema que justifica investir em uma proposta">
                <div className="space-y-2">
                  <FieldLabel hint="selecione uma ou mais — gerenciadas em Configurações">
                    Categorias da dor
                  </FieldLabel>
                  <PainCategoriesMultiSelect
                    value={lead.pain_categories ?? []}
                    onChange={(v) => save({ pain_categories: v })}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel hint="seja específico — vagueza vira escopo ruim">Descrição da dor</FieldLabel>
                  <InlineText
                    value={lead.pain_description}
                    onSave={(v) => save({ pain_description: v })}
                    placeholder={`1. O que acontece hoje?\n2. Quem sente?\n3. Qual o impacto (dinheiro, tempo, retrabalho)?\n4. O que já tentaram?`}
                    multiline
                    minHeight={140}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel hint="estimativa do cliente, ok ser aproximado">Custo da dor (R$/mês)</FieldLabel>
                    <InlineMoney
                      value={lead.pain_cost_brl_monthly}
                      onSave={(v) => save({ pain_cost_brl_monthly: v })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Horas perdidas (h/mês)</FieldLabel>
                    <InlineInteger
                      value={lead.pain_hours_monthly}
                      onSave={(v) => save({ pain_hours_monthly: v })}
                      placeholder="0"
                      suffix="h"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabel hint="planilha, sistema legado, processo manual...">
                    Solução atual / workaround
                  </FieldLabel>
                  <InlineText
                    value={lead.current_solution}
                    onSave={(v) => save({ current_solution: v })}
                    placeholder="O que usam hoje para mitigar essa dor?"
                    multiline
                    minHeight={80}
                  />
                </div>
              </ZoneSection>

              {/* 03 — Triagem */}
              <ZoneSection number={3} title="Triagem" hint="Resumo da reunião de qualificação">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel>Canal</FieldLabel>
                    <select
                      value={lead.triagem_channel ?? ''}
                      onChange={(e) => save({ triagem_channel: e.target.value || null })}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background/60 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">— Selecionar —</option>
                      {TRIAGEM_CHANNELS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Duração (minutos)</FieldLabel>
                    <InlineInteger
                      value={lead.triagem_duration_minutes}
                      onSave={(v) => save({ triagem_duration_minutes: v })}
                      placeholder="30"
                      suffix="min"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabel hint="o que rolou, decisores envolvidos, sinais de compra/cautela">
                    Resumo da triagem
                  </FieldLabel>
                  <InlineText
                    value={lead.triagem_summary}
                    onSave={(v) => save({ triagem_summary: v })}
                    placeholder="O que você descobriu na conversa? Qual a leitura?"
                    multiline
                    minHeight={120}
                  />
                </div>
              </ZoneSection>

              {/* 04 — Próximo passo + notas livres */}
              <ZoneSection number={4} title="Próximo passo & notas" hint="Ação clara que destrava o lead">
                <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                  <div className="space-y-2">
                    <FieldLabel>Próximo passo</FieldLabel>
                    <InlineText
                      value={lead.next_step}
                      onSave={(v) => save({ next_step: v })}
                      placeholder="Ex: enviar proposta inicial, marcar follow-up..."
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Quando</FieldLabel>
                    <input
                      type="date"
                      value={lead.next_step_date ?? ''}
                      onChange={(e) => save({ next_step_date: e.target.value || null })}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background/60 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabel>Notas livres</FieldLabel>
                  <InlineText
                    value={lead.notes}
                    onSave={(v) => save({ notes: v })}
                    placeholder="Qualquer outra anotação sobre este lead."
                    multiline
                    minHeight={120}
                  />
                </div>
              </ZoneSection>
            </TabsContent>

            <TabsContent value="activities" className="mt-5">
              <ActivityPanel entity={{ type: 'lead', id: lead.id }} activities={activities} />
            </TabsContent>

            <TabsContent value="timeline" className="mt-5">
              <MiniTimeline rows={audit} />
            </TabsContent>
          </Tabs>
        </main>

        {/* Sidebar desktop */}
        <div className="hidden lg:block">
          <LeadSidebar lead={lead} save={save} />
        </div>
      </div>

      <ConvertLeadDialog lead={lead} open={convertOpen} onOpenChange={setConvertOpen} />

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar {lead.code}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo do descarte (obrigatório)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!reason.trim()}
              onClick={() => {
                save({ status: 'descartado', lost_reason: reason });
                setDiscardOpen(false);
                setReason('');
              }}
            >
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DangerZoneLead lead={lead} />
    </DetailShell>
  );
}

function DangerZoneLead({ lead }: { lead: Lead }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const deleteLead = useDeleteLead();
  return (
    <DangerZone
      entityLabel="lead"
      entityName={`${lead.code} — ${lead.title}`}
      cascadeWarning="Atividades vinculadas a este lead serão removidas em cascata."
      onDelete={async () => {
        await deleteLead.mutateAsync(lead.id);
        invalidateCrmCaches(qc, { leadId: lead.id, companyId: lead.company_id });
        toast.success('Lead excluído.');
        navigate('/crm/leads');
      }}
    />
  );
}
