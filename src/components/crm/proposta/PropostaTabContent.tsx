import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus, FileText, Loader2, ExternalLink, Download, Send, Check, X, Pencil, AlertTriangle, ArrowDown, Sparkles,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { createProposalFromDeal } from '@/lib/orcamentos/createProposalFromDeal';
import { invalidateProposalCaches } from '@/lib/cacheInvalidation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useConfirm } from '@/components/ConfirmDialog';
import { supabase } from '@/integrations/supabase/client';
import { OrcamentoStatusBadge } from '@/components/orcamentos/OrcamentoStatusBadge';
import { ScopeItemsEditor } from '@/components/orcamentos/ScopeItemsEditor';
import { MarcarComoEnviadaDialog } from '@/components/orcamentos/MarcarComoEnviadaDialog';
import { LinkGeradoDialog } from '@/components/orcamentos/LinkGeradoDialog';
import { RedefinirSenhaDialog } from '@/components/orcamentos/RedefinirSenhaDialog';
import {
  calculateScopeTotal, effectiveStatus, formatBRL, formatDateBR,
  type ProposalStatus, type ScopeItem,
} from '@/lib/orcamentos/calculateTotal';
import { openProposalPdf } from '@/lib/orcamentos/storage';
import { useUpdateDealField } from '@/hooks/crm/useCrmDetails';
import { AnexoUploader } from './AnexoUploader';
import type { Deal } from '@/types/crm';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const sb = supabase as any;

interface Props {
  deal: Deal;
  onRequestClose?: () => void;
}

interface ProposalRow {
  id: string;
  code: string;
  status: ProposalStatus;
  scope_items: ScopeItem[];
  maintenance_monthly_value: number | null;
  valid_until: string;
  pdf_url: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  client_company_name: string;
}

// ---------- Bloco 1: Proposta ----------

function PropostaCard({ deal, proposal, onChanged, onRequestClose }: {
  deal: Deal;
  proposal: ProposalRow;
  onChanged: () => void;
  onRequestClose?: () => void;
}) {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  const updateDeal = useUpdateDealField(deal.code);
  const [items, setItems] = useState<ScopeItem[]>(proposal.scope_items ?? []);
  const [maintenance, setMaintenance] = useState<string>(
    proposal.maintenance_monthly_value ? String(proposal.maintenance_monthly_value) : ''
  );
  const [validUntil, setValidUntil] = useState(proposal.valid_until);
  const [saving, setSaving] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [generatedTokenInfo, setGeneratedTokenInfo] = useState<{ accessToken: string; expiresAt: string } | null>(null);

  useEffect(() => {
    setItems(proposal.scope_items ?? []);
    setMaintenance(proposal.maintenance_monthly_value ? String(proposal.maintenance_monthly_value) : '');
    setValidUntil(proposal.valid_until);
  }, [proposal.id]);

  const total = calculateScopeTotal(items);
  const eff = effectiveStatus(proposal.status, validUntil);
  const monthlyNum = maintenance.trim() === '' ? null : Number(maintenance);

  // Divergência de valor: total da proposta vs estimated_value do deal
  const dealValue = Number(deal.estimated_value ?? 0);
  const valueDiverges = total > 0 && dealValue > 0 && Math.abs(total - dealValue) > 0.01;
  const noDealValue = total > 0 && dealValue === 0;

  async function persist(extra: Record<string, any> = {}, opts: { syncItems?: boolean } = {}) {
    setSaving(true);
    try {
      const userRes = await supabase.auth.getUser();
      const uid = userRes.data.user?.id ?? null;
      const { error } = await sb.from('proposals').update({
        scope_items: items,
        maintenance_monthly_value: monthlyNum && monthlyNum > 0 ? monthlyNum : null,
        valid_until: validUntil,
        expires_at: validUntil,
        updated_by: uid,
        ...extra,
      }).eq('id', proposal.id);
      if (error) throw error;

      // Espelha em proposal_items (tabela canônica do schema 10A)
      if (opts.syncItems !== false) {
        await sb.from('proposal_items').update({ deleted_at: new Date().toISOString() })
          .eq('proposal_id', proposal.id).is('deleted_at', null);
        if (items.length > 0) {
          const rows = items.map((it, i) => ({
            proposal_id: proposal.id,
            description: it.title || 'Item',
            quantity: 1,
            unit_price: Number(it.value) || 0,
            order_index: i,
            created_by: uid,
            updated_by: uid,
          }));
          await sb.from('proposal_items').insert(rows);
        }
      }
      onChanged();
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e?.message ?? 'tente novamente'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenSend() {
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item antes de enviar');
      return;
    }
    if (!validUntil) {
      toast.error('Defina a validade antes de enviar');
      return;
    }
    // Garante que itens recentes estejam persistidos antes de exigir senha
    await persist();
    setSendDialogOpen(true);
  }

  async function handleAccept() {
    await persist({ status: 'convertida', accepted_at: new Date().toISOString() });
    toast.success('Proposta aceita');
    // Oferece fechar o deal como ganho na sequência
    if (onRequestClose && deal.stage !== 'ganho' && deal.stage !== 'perdido') {
      const ok = await confirm({
        title: 'Fechar o deal como ganho?',
        description: 'A proposta foi aceita. Você quer fechar o deal agora — criando o projeto e gerando as parcelas financeiras?',
        confirmLabel: 'Sim, fechar agora',
      });
      if (ok) onRequestClose();
    }
  }

  async function handleReject() {
    const ok = await confirm({
      title: 'Recusar proposta?',
      description: 'Você pode criar uma nova versão depois.',
      confirmLabel: 'Recusar',
      variant: 'destructive',
    });
    if (!ok) return;
    await persist({ status: 'recusada', rejected_at: new Date().toISOString() });
    toast.success('Proposta recusada');
  }

  async function handleSyncValue() {
    if (total <= 0) return;
    updateDeal.mutate(
      { id: deal.id, updates: { estimated_value: total } },
      {
        onSuccess: () => toast.success(`Valor do deal atualizado pra ${formatBRL(total)}`),
        onError: (e: any) => toast.error(`Erro: ${e?.message ?? 'tente novamente'}`),
      },
    );
  }

  function handleImportFromDiscovery() {
    const deliverables = deal.deliverables ?? [];
    if (deliverables.length === 0) {
      toast.error('Nenhum entregável na descoberta. Liste os entregáveis na aba Descoberta primeiro.');
      return;
    }
    const imported: ScopeItem[] = deliverables.map((d) => ({
      id: Math.random().toString(36).slice(2, 10),
      title: d,
      value: 0,
    } as ScopeItem));
    // Preserva os itens já existentes (evita perda acidental)
    setItems((prev) => [...prev, ...imported]);
    toast.success(`${imported.length} item(ns) importado(s) da descoberta — ajuste os valores e salve`);
  }

  return (
    <div className="rounded-lg border border-border bg-card/40">
      {dialog}
      {/* Header da proposta */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 p-4">
        <span className="font-mono text-sm font-semibold">{proposal.code}</span>
        <OrcamentoStatusBadge status={eff} />
        <div className="ml-auto flex items-center gap-3">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
            <span className="font-mono text-base font-bold tabular-nums text-success">{formatBRL(total)}</span>
          </div>
          {monthlyNum && monthlyNum > 0 && (
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Mensal</span>
              <span className="font-mono text-sm font-bold tabular-nums text-primary">{formatBRL(monthlyNum)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Aviso de divergência de valor com deal */}
      {(valueDiverges || noDealValue) && (
        <div className="border-b border-border/60 bg-warning/5 px-4 py-2.5 text-xs flex flex-wrap items-center gap-3">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
          <span className="flex-1 min-w-[200px]">
            {noDealValue
              ? <>O deal está sem valor estimado. A proposta soma <strong className="font-mono">{formatBRL(total)}</strong>.</>
              : <>Divergência: deal estima <strong className="font-mono">{formatBRL(dealValue)}</strong> · proposta soma <strong className="font-mono">{formatBRL(total)}</strong>.</>}
            <span className="text-muted-foreground"> O dashboard CRM usa o valor do deal pra forecast.</span>
          </span>
          <Button size="sm" variant="outline" onClick={handleSyncValue} disabled={updateDeal.isPending}>
            <ArrowDown className="h-3.5 w-3.5" /> Sincronizar valor do deal
          </Button>
        </div>
      )}

      {/* Edição inline */}
      <div className="space-y-4 p-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Itens da proposta
            </Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={handleImportFromDiscovery}
              title="Importa cada entregável da Descoberta como item de escopo (com valor zero)"
            >
              + Importar da descoberta ({deal.deliverables?.length ?? 0})
            </Button>
          </div>
          <div className="mt-2">
            <ScopeItemsEditor items={items} onChange={setItems} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Manutenção mensal (R$)
            </Label>
            <CurrencyInput
              value={maintenance}
              onValueChange={setMaintenance}
              withPrefix
              placeholder="R$ 0,00"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Validade
            </Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <Button size="sm" variant="outline" onClick={() => persist()} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Salvar alterações
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/financeiro/orcamentos/${proposal.id}/editar`)}
          >
            <Pencil className="h-3.5 w-3.5" /> Editor completo (PDF, template, preview)
          </Button>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {proposal.pdf_url && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await openProposalPdf(proposal.pdf_url!);
                  } catch (e: any) {
                    toast.error(e?.message || 'Falha ao abrir PDF');
                  }
                }}
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
            )}
            {proposal.status === 'rascunho' && (
              <Button size="sm" onClick={handleOpenSend} disabled={saving}>
                <Send className="h-3.5 w-3.5" /> Marcar como enviada
              </Button>
            )}
            {proposal.status === 'enviada' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if ((proposal as any).access_token) {
                      setGeneratedTokenInfo({
                        accessToken: (proposal as any).access_token,
                        expiresAt: validUntil,
                      });
                      setLinkDialogOpen(true);
                    } else {
                      toast.error('Esta proposta não tem link de acesso');
                    }
                  }}
                >
                  Ver link
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPwdDialogOpen(true)}>
                  Redefinir senha
                </Button>
                <Button
                  size="sm"
                  className="bg-success text-success-foreground hover:bg-success/90"
                  onClick={handleAccept}
                  disabled={saving}
                >
                  <Check className="h-3.5 w-3.5" /> Aceitar
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={handleReject} disabled={saving}>
                  <X className="h-3.5 w-3.5" /> Recusar
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Datas-chave */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>Criada em <span className="font-mono">{formatDateBR(proposal.created_at)}</span></span>
          {proposal.sent_at && <span>Enviada em <span className="font-mono">{formatDateBR(proposal.sent_at)}</span></span>}
          {proposal.accepted_at && <span>Aceita em <span className="font-mono">{formatDateBR(proposal.accepted_at)}</span></span>}
          {proposal.rejected_at && <span>Recusada em <span className="font-mono">{formatDateBR(proposal.rejected_at)}</span></span>}
        </div>
      </div>

      {/* Modais 10A — senha + link */}
      <MarcarComoEnviadaDialog
        proposalId={proposal.id}
        proposalCode={proposal.code}
        expiresAt={validUntil || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        onSent={(info) => {
          setGeneratedTokenInfo(info);
          setLinkDialogOpen(true);
          setValidUntil(info.expiresAt);
          onChanged();
        }}
      />
      <LinkGeradoDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        accessToken={generatedTokenInfo?.accessToken ?? null}
        expiresAt={generatedTokenInfo?.expiresAt ?? validUntil}
      />
      <RedefinirSenhaDialog
        proposalId={proposal.id}
        proposalCode={proposal.code}
        open={pwdDialogOpen}
        onOpenChange={setPwdDialogOpen}
      />
    </div>
  );
}

function PropostaBlock({ deal, onRequestClose }: { deal: Deal; onRequestClose?: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [conflict, setConflict] = useState<{
    open: boolean;
    existingId?: string;
    existingCode?: string;
    message?: string;
  }>({ open: false });

  async function load() {
    setLoading(true);
    const { data } = await sb
      .from('proposals')
      .select('id, code, status, scope_items, maintenance_monthly_value, valid_until, pdf_url, sent_at, accepted_at, rejected_at, created_at, client_company_name')
      .eq('deal_id', deal.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as ProposalRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [deal.id]);

  async function runCreate(force: boolean) {
    setCreating(true);
    try {
      const result = await createProposalFromDeal(deal.id, force);
      if ('conflict' in result && result.conflict) {
        setConflict({
          open: true,
          existingId: result.existingProposalId,
          existingCode: result.existingProposalCode,
          message: result.message,
        });
        return;
      }
      const created = result as Exclude<typeof result, { conflict: true }>;
      invalidateProposalCaches(qc);
      await load();
      toast.success(`Proposta ${created.proposalCode} criada`, {
        description: `${created.itemsImported} item(ns) importados. Senha: ${created.defaultPasswordPlain}`,
        duration: 8000,
      });
      navigate(`/financeiro/orcamentos/${created.proposalId}/editar`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar proposta a partir do deal');
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmConflict() {
    setConflict({ open: false });
    await runCreate(true);
  }

  function goToExisting() {
    if (conflict.existingId) navigate(`/financeiro/orcamentos/${conflict.existingId}/editar`);
    setConflict({ open: false });
  }

  const active = rows[0];
  const previous = rows.slice(1);
  const hasProposals = rows.length > 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Proposta comercial</h3>
          <p className="text-xs text-muted-foreground">
            Edite escopo, valor e status sem sair do deal. Pra preview, template e PDF use o editor completo.
          </p>
        </div>
        {hasProposals && (
          <Button size="sm" variant="outline" onClick={() => runCreate(false)} disabled={creating}>
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Gerar nova versão
          </Button>
        )}
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card/30 p-6 text-center text-xs text-muted-foreground">
          Carregando…
        </div>
      ) : !hasProposals ? (
        <div className="rounded-lg border border-dashed border-border bg-card/20 p-8 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-foreground">Sem proposta vinculada</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Importe os dados deste deal para criar uma proposta pronta pra revisão.
          </p>
          <Button className="mt-4" onClick={() => runCreate(false)} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar proposta a partir deste deal
          </Button>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Vamos puxar dor, solução, escopo e dependências automaticamente. Você revisa antes de enviar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <PropostaCard deal={deal} proposal={active} onChanged={load} onRequestClose={onRequestClose} />

          {previous.length > 0 && (
            <details className="rounded-lg border border-border bg-card/20">
              <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/20">
                Versões anteriores ({previous.length})
              </summary>
              <div className="divide-y divide-border/60">
                {previous.map((p) => {
                  const total = calculateScopeTotal(p.scope_items);
                  const eff = effectiveStatus(p.status, p.valid_until);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => navigate(`/financeiro/orcamentos/${p.id}/editar`)}
                      className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/20"
                    >
                      <span className="font-mono text-xs font-semibold">{p.code}</span>
                      <OrcamentoStatusBadge status={eff} />
                      <span className="ml-auto font-mono text-xs tabular-nums text-success">{formatBRL(total)}</span>
                      <span className="w-20 text-right font-mono text-[11px] text-muted-foreground">
                        {formatDateBR(p.valid_until)}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

// ---------- Bloco 2: Organograma ----------

function OrganogramaBlock({ deal }: { deal: Deal }) {
  const update = useUpdateDealField(deal.code);
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Organograma do cliente</h3>
        <p className="text-xs text-muted-foreground">
          Suba o PNG/PDF exportado do Draw.io. Versão estruturada (decisores, influenciadores, papéis) chega na Fase 2.
        </p>
      </div>
      <AnexoUploader
        mode="single"
        dealId={deal.id}
        folder="organograma"
        value={deal.organograma_url ?? null}
        onChange={(url) => update.mutate({ id: deal.id, updates: { organograma_url: url } })}
        accept="image/*,.pdf"
        label="Clique pra subir o organograma (PNG, JPG ou PDF)"
      />
    </section>
  );
}

// ---------- Bloco 3: Mockup BETA ----------

function MockupBlock({ deal }: { deal: Deal }) {
  const update = useUpdateDealField(deal.code);
  const [link, setLink] = useState(deal.mockup_url ?? '');

  useEffect(() => { setLink(deal.mockup_url ?? ''); }, [deal.mockup_url]);

  const commitLink = () => {
    const next = link.trim() === '' ? null : link.trim();
    if (next !== (deal.mockup_url ?? null)) {
      update.mutate({ id: deal.id, updates: { mockup_url: next } });
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Mockup BETA</h3>
        <p className="text-xs text-muted-foreground">
          Link do preview Lovable (ou outro) + galeria de prints pro cliente visualizar o sistema antes do contrato.
        </p>
      </div>

      <div>
        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Link do preview
        </Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            type="url"
            placeholder="https://preview.lovable.app/..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onBlur={commitLink}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
          />
          {deal.mockup_url && (
            <Button asChild variant="outline" size="icon">
              <a href={deal.mockup_url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <div>
        <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Prints do mockup ({deal.mockup_screenshots?.length ?? 0})
        </Label>
        <div className="mt-1.5">
          <AnexoUploader
            mode="multiple"
            dealId={deal.id}
            folder="mockup"
            value={deal.mockup_screenshots ?? []}
            onChange={(urls) => update.mutate({ id: deal.id, updates: { mockup_screenshots: urls } })}
            label="Adicionar prints"
            max={12}
          />
        </div>
      </div>
    </section>
  );
}

// ---------- Container ----------

export function PropostaTabContent({ deal, onRequestClose }: Props) {
  return (
    <div className="space-y-8">
      <PropostaBlock deal={deal} onRequestClose={onRequestClose} />
      <div className="border-t border-border/60" />
      <OrganogramaBlock deal={deal} />
      <div className="border-t border-border/60" />
      <MockupBlock deal={deal} />
    </div>
  );
}
