import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ActivityPanel } from '@/components/crm/ActivityPanel';
import { DetailBreadcrumb, DetailShell } from '@/components/crm/CrmDetailShared';
import { DangerZone } from '@/components/crm/DangerZone';
import { ZoneSection } from '@/components/crm/ZoneSection';
import { FieldLabel, InlineInteger, InlineText } from '@/components/crm/inlineFields';
import { LeadHeader } from '@/components/crm/LeadHeader';
import { LeadSidebar } from '@/components/crm/LeadSidebar';
import { ConvertLeadDialog } from '@/components/crm/ConvertLeadDialog';
import {
  useActivitiesForEntity, useEntityAudit, useLeadByCode, useUpdateLeadField,
} from '@/hooks/crm/useCrmDetails';
import { useDeleteLead } from '@/hooks/crm/useLeads';
import { invalidateCrmCaches } from '@/lib/cacheInvalidation';
import type { Lead } from '@/types/crm';

const TRIAGEM_CHANNELS = [
  'Google Meet', 'Zoom', 'WhatsApp', 'Telefone', 'Presencial', 'Outro',
] as const;

function MiniTimeline({ rows }: { rows: { id: string; created_at: string; action: string }[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nenhum evento registrado.
      </div>
    );
  }

  // agrupa por dia (mesmo padrão visual do AdminAuditoriaPage)
  const groups = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    const day = new Date(r.created_at).toLocaleDateString('pt-BR');
    (acc[day] = acc[day] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([day, evts]) => (
        <div key={day}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {day}
          </p>
          <div className="space-y-2">
            {evts.map((r) => (
              <article key={r.id} className="rounded-lg border border-border bg-card/40 p-3 text-sm">
                <p>{r.action}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </article>
            ))}
          </div>
        </div>
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
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
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

  const isLocked = lead.status === 'convertido';
  const canConvert = lead.status === 'triagem_feita';

  const openSchedule = () => {
    setScheduleAt(lead.triagem_scheduled_at ? lead.triagem_scheduled_at.slice(0, 16) : '');
    setScheduleOpen(true);
  };

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
        onScheduleTriagem={openSchedule}
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
              {/* 01 — Origem & primeiro contato */}
              <ZoneSection
                number={1}
                title="Origem & primeiro contato"
                hint="O mínimo para decidir se vale uma triagem"
              >
                <div className="space-y-2">
                  <FieldLabel hint="o que motivou esse lead — sinal de interesse, indicação, mensagem recebida...">
                    O que sabemos
                  </FieldLabel>
                  <InlineText
                    value={lead.pain_description}
                    onSave={(v) => save({ pain_description: v })}
                    placeholder="Ex: chegou via indicação do João. Disse que tem problema com X. Quer entender se podemos ajudar."
                    multiline
                    minHeight={90}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Origem, valor estimado, dono e contato ficam na barra lateral. Sem encher de campos antes da triagem.
                </p>
              </ZoneSection>

              {/* 02 — Triagem */}
              <ZoneSection
                number={2}
                title="Triagem"
                hint="A conversa de qualificação que decide se vira Deal"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel>Canal</FieldLabel>
                    <Select
                      value={lead.triagem_channel ?? 'none'}
                      onValueChange={(v) => save({ triagem_channel: v === 'none' ? null : v })}
                    >
                      <SelectTrigger className="bg-background/60">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Não definido —</SelectItem>
                        {TRIAGEM_CHANNELS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <FieldLabel hint="o que rolou, sinais de compra/cautela, decisores, próximos passos comerciais">
                    Resumo da triagem
                  </FieldLabel>
                  <InlineText
                    value={lead.triagem_summary}
                    onSave={(v) => save({ triagem_summary: v })}
                    placeholder={`O que você descobriu na conversa?\n\nEsse texto vai virar o "Contexto" inicial do Deal quando você converter.`}
                    multiline
                    minHeight={140}
                  />
                </div>
                {lead.status !== 'triagem_feita' && lead.status !== 'convertido' && lead.status !== 'descartado' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        save({
                          status: 'triagem_feita',
                          triagem_happened_at: lead.triagem_happened_at ?? new Date().toISOString(),
                        })
                      }
                    >
                      Marcar triagem como feita
                    </Button>
                  </div>
                )}
              </ZoneSection>

              {/* 03 — Veredito */}
              <ZoneSection
                number={3}
                title="Veredito"
                hint="A decisão depois da triagem"
              >
                {lead.status === 'convertido' && lead.converted_deal_code ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <p className="text-sm font-medium text-primary">Lead convertido</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Toda a qualificação detalhada agora vive no deal abaixo.
                    </p>
                    <Button asChild size="sm" className="mt-3">
                      <Link to={`/crm/deals/${lead.converted_deal_code}`}>
                        Abrir {lead.converted_deal_code}
                      </Link>
                    </Button>
                  </div>
                ) : lead.status === 'descartado' ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                    <p className="text-sm font-medium text-destructive">Descartado</p>
                    {lead.lost_reason && (
                      <p className="text-xs text-muted-foreground">{lead.lost_reason}</p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => save({ status: 'novo', lost_reason: null })}
                    >
                      Reabrir lead
                    </Button>
                  </div>
                ) : canConvert ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">Pronto para virar Deal</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Empresa, contato, dono, origem e o resumo da triagem vão junto.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setConvertOpen(true)}>
                      Converter em Deal
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDiscardOpen(true)}>
                      Descartar
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Faça a triagem antes de decidir converter ou descartar.
                  </div>
                )}
              </ZoneSection>

              {/* Notas livres (sutil, fora das 3 zonas — opcional) */}
              <ZoneSection
                number={4}
                title="Notas livres"
                hint="Anotações soltas que não cabem em nenhum lugar acima (opcional)"
              >
                <InlineText
                  value={lead.notes}
                  onSave={(v) => save({ notes: v })}
                  placeholder="Use só se precisar."
                  multiline
                  minHeight={80}
                />
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

      {/* Agendar triagem */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar triagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <FieldLabel>Data e hora</FieldLabel>
            <Input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancelar</Button>
            <Button
              disabled={!scheduleAt}
              onClick={() => {
                save({
                  status: 'triagem_agendada',
                  triagem_scheduled_at: new Date(scheduleAt).toISOString(),
                });
                setScheduleOpen(false);
              }}
            >
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Descartar */}
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

      {!isLocked && <DangerZoneLead lead={lead} />}
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
