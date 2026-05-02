import { Link } from 'react-router-dom';
import { Building2, ExternalLink, Mail, Phone, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { FieldLabel } from '@/components/crm/inlineFields';
import { useCompanyStats, useCompanyDeals, useCompanyLeads } from '@/hooks/crm/useCrmDetails';
import { useCrmActors, usePeopleByCompany } from '@/hooks/crm/useCrmReference';
import { useCrmLeadSources } from '@/hooks/crm/useCrmLeadSources';
import { formatCurrency } from '@/lib/formatters';
import type { Lead, LeadStatus } from '@/types/crm';

const STATUS_OPTIONS: LeadStatus[] = ['novo', 'triagem_agendada', 'triagem_feita', 'descartado', 'convertido'];
const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: 'Novo',
  triagem_agendada: 'Triagem agendada',
  triagem_feita: 'Triagem feita',
  descartado: 'Descartado',
  convertido: 'Convertido',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-b border-border/40 pb-4 last:border-b-0 last:pb-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">{title}</p>
      {children}
    </div>
  );
}

interface Props {
  lead: Lead;
  save: (updates: Partial<Lead>) => void;
}

export function LeadSidebar({ lead, save }: Props) {
  const { data: stats } = useCompanyStats(lead.company_id);
  const { data: actors = [] } = useCrmActors();
  const { data: contacts = [] } = usePeopleByCompany(lead.company_id);
  const { data: leadSources = [] } = useCrmLeadSources({ onlyActive: true });
  const { data: relatedLeads = [] } = useCompanyLeads(lead.company_id);
  const { data: relatedDeals = [] } = useCompanyDeals(lead.company_id);

  const otherLeads = relatedLeads.filter((l) => l.id !== lead.id).slice(0, 3);
  const otherDeals = relatedDeals.slice(0, 3);
  const contact = contacts.find((c) => c.id === lead.contact_person_id);

  return (
    <aside className="space-y-5 rounded-lg border border-border bg-card/30 p-4">
      {/* STATUS */}
      <Section title="Status do lead">
        <Select
          value={lead.status}
          onValueChange={(v) => v !== 'convertido' && save({ status: v as LeadStatus })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} disabled={s === 'convertido'}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      {/* EMPRESA */}
      <Section title="Empresa">
        <Link
          to={`/crm/empresas/${lead.company_id}`}
          className="group flex items-start gap-3 rounded-md border border-border bg-background/40 p-3 transition hover:border-accent/50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground group-hover:text-accent">
              {lead.company?.trade_name || lead.company?.legal_name}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {(stats?.dealsOpen ?? 0)} deals · {(stats?.projects ?? 0)} projetos
              {(stats?.revenueWon ?? 0) > 0 && ` · ${formatCurrency(stats?.revenueWon ?? 0)} ganhos`}
            </p>
          </div>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Link>
      </Section>

      {/* CONTATO */}
      <Section title="Contato">
        <Select
          value={lead.contact_person_id ?? 'none'}
          onValueChange={(v) => save({ contact_person_id: v === 'none' ? null : v })}
        >
          <SelectTrigger><SelectValue placeholder="Selecionar contato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem contato</SelectItem>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {contact && (
          <div className="mt-2 space-y-1 rounded-md border border-border/60 bg-background/30 p-2.5 text-xs">
            <p className="font-medium text-foreground">{contact.full_name}</p>
            {contact.role_in_company && (
              <p className="text-muted-foreground">{contact.role_in_company}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  <Mail className="h-3 w-3" /> {contact.email}
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  <Phone className="h-3 w-3" /> {contact.phone}
                </a>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* DONO */}
      <Section title="Dono">
        <Select
          value={lead.owner_actor_id ?? 'none'}
          onValueChange={(v) => save({ owner_actor_id: v === 'none' ? null : v })}
        >
          <SelectTrigger>
            <SelectValue>
              {lead.owner ? (
                <span className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={lead.owner.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {lead.owner.display_name.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  {lead.owner.display_name}
                </span>
              ) : (
                <span className="text-muted-foreground">Sem dono</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem dono</SelectItem>
            {actors.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <span className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {a.display_name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      {/* ORIGEM & VALOR */}
      <Section title="Origem & valor">
        <div className="space-y-2">
          <Select
            value={lead.source ?? 'none'}
            onValueChange={(v) => save({ source: v === 'none' ? null : v })}
          >
            <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem origem</SelectItem>
              {lead.source && !leadSources.find((s) => s.slug === lead.source) && (
                <SelectItem value={lead.source}>{lead.source} (legado)</SelectItem>
              )}
              {leadSources.map((s) => (
                <SelectItem key={s.id} value={s.slug}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Valor estimado"
            defaultValue={lead.estimated_value ?? ''}
            onBlur={(e) => save({ estimated_value: e.target.value ? Number(e.target.value) : null })}
            className="bg-background/60"
          />
        </div>
      </Section>

      {/* TRIAGEM (datas) */}
      <Section title="Triagem">
        <div className="space-y-2">
          <FieldLabel>Agendada</FieldLabel>
          <Input
            type="datetime-local"
            value={lead.triagem_scheduled_at ? lead.triagem_scheduled_at.slice(0, 16) : ''}
            onChange={(e) => save({ triagem_scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="bg-background/60"
          />
          <FieldLabel>Aconteceu</FieldLabel>
          <Input
            type="datetime-local"
            value={lead.triagem_happened_at ? lead.triagem_happened_at.slice(0, 16) : ''}
            onChange={(e) => save({ triagem_happened_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="bg-background/60"
          />
        </div>
      </Section>

      {/* HISTÓRICO RELACIONADO */}
      {(otherLeads.length > 0 || otherDeals.length > 0) && (
        <Section title="Outros registros desta empresa">
          <div className="space-y-1.5">
            {otherDeals.map((d) => (
              <Link
                key={d.id}
                to={`/crm/deals/${d.code}`}
                className="flex items-center justify-between rounded border border-border/60 bg-background/30 px-2.5 py-1.5 text-xs transition hover:border-accent/50"
              >
                <span className="truncate">
                  <span className="font-mono text-muted-foreground">{d.code}</span>{' '}
                  <span className="text-foreground">{d.title}</span>
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {formatCurrency(Number(d.estimated_value ?? 0))}
                </span>
              </Link>
            ))}
            {otherLeads.map((l) => (
              <Link
                key={l.id}
                to={`/crm/leads/${l.code}`}
                className="flex items-center justify-between rounded border border-border/60 bg-background/30 px-2.5 py-1.5 text-xs transition hover:border-accent/50"
              >
                <span className="truncate">
                  <span className="font-mono text-muted-foreground">{l.code}</span>{' '}
                  <span className="text-foreground">{l.title}</span>
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {STATUS_LABEL[l.status]}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* METADATA */}
      <Section title="Metadata">
        <div className="space-y-1 text-[11px] text-muted-foreground">
          {lead.created_at && (
            <p>Criado em {new Date(lead.created_at).toLocaleDateString('pt-BR')}</p>
          )}
          {lead.converted_at && (
            <p>Convertido em {new Date(lead.converted_at).toLocaleDateString('pt-BR')}</p>
          )}
        </div>
      </Section>
    </aside>
  );
}
