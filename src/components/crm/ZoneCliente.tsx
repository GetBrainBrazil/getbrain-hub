import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Upload, Loader2, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SectorPicker } from './SectorPicker';
import { CompanyContactsManager } from './CompanyContactsManager';
import {
  CLIENT_TYPE_LABEL, CLIENT_TYPE_OPTIONS, CLIENT_TYPE_COLOR, CLIENT_TYPE_DESCRIPTION,
  REVENUE_RANGE_LABEL, REVENUE_RANGE_OPTIONS,
  DIGITAL_MATURITY_LABEL, DIGITAL_MATURITY_DESCRIPTION,
} from '@/constants/companyEnumLabels';
import {
  useCompanyDetail, useUpdateCompanyField, useUpdateDealField,
} from '@/hooks/crm/useCrmDetails';
import { cn } from '@/lib/utils';
import type {
  CompanyClientType, CompanyRevenueRange, Deal,
} from '@/types/crm';

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</Label>
      {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
    </div>
  );
}

function ChipGroup<T extends string>({
  options, value, onChange, labels, colors,
}: {
  options: T[]; value: T | null; onChange: (v: T | null) => void;
  labels: Record<T, string>; colors?: Record<T, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(active ? null : o)}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all',
              active
                ? cn(
                    colors?.[o] ?? 'bg-accent/20 text-accent border-accent',
                    'font-semibold ring-2 ring-accent/40 ring-offset-1 ring-offset-background shadow-sm',
                  )
                : 'border-border bg-muted/20 text-muted-foreground hover:border-accent/40 hover:text-foreground hover:bg-muted/40',
            )}
          >
            {labels[o]}
          </button>
        );
      })}
    </div>
  );
}

/** Paleta termômetro: vermelho → laranja → amarelo → verde → ciano (accent). */
const MATURITY_COLORS: Record<number, { bar: string; text: string; border: string; soft: string }> = {
  1: { bar: 'bg-destructive', text: 'text-destructive', border: 'border-destructive', soft: 'bg-destructive/10' },
  2: { bar: 'bg-warning',     text: 'text-warning',     border: 'border-warning',     soft: 'bg-warning/10' },
  3: { bar: 'bg-chart-4',     text: 'text-chart-4',     border: 'border-chart-4',     soft: 'bg-chart-4/10' },
  4: { bar: 'bg-success',     text: 'text-success',     border: 'border-success',     soft: 'bg-success/10' },
  5: { bar: 'bg-accent',      text: 'text-accent',      border: 'border-accent',      soft: 'bg-accent/10' },
};

function MaturityScale({ value, onSave }: { value: number | null; onSave: (v: number) => void }) {
  const [local, setLocal] = useState<number>(value ?? 0);
  useEffect(() => { setLocal(value ?? 0); }, [value]);
  const current = local || 1;
  const palette = MATURITY_COLORS[current];
  return (
    <div className="rounded-md border border-input bg-background/60 px-3 py-3">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = local >= n;
          const isCurrent = local === n;
          const c = MATURITY_COLORS[n];
          return (
            <button
              key={n}
              type="button"
              onClick={() => { setLocal(n); onSave(n); }}
              aria-label={`Nível ${n}: ${DIGITAL_MATURITY_LABEL[n]}`}
              className={cn(
                'flex h-9 flex-1 items-center justify-center rounded-md border text-xs font-bold transition-all',
                filled
                  ? cn(c.bar, 'border-transparent text-background shadow-sm', isCurrent && 'ring-2 ring-offset-1 ring-offset-background', isCurrent && c.border.replace('border-', 'ring-'))
                  : 'border-border bg-muted/20 text-muted-foreground hover:border-foreground/40 hover:text-foreground',
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className={cn('text-xs font-semibold', local > 0 ? palette.text : 'text-foreground')}>
          {local > 0 ? DIGITAL_MATURITY_LABEL[current] : 'Selecione um nível'}
        </span>
        <span className="text-[10px] text-muted-foreground">{local > 0 ? `${current}/5` : '—'}</span>
      </div>
      {local > 0 && (
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {DIGITAL_MATURITY_DESCRIPTION[current]}
        </p>
      )}
    </div>
  );
}

function ClientTypeCards<T extends string>({
  options, value, onChange, labels, descriptions, colors,
}: {
  options: T[]; value: T | null; onChange: (v: T | null) => void;
  labels: Record<T, string>; descriptions: Record<T, string>;
  colors?: Record<T, { active: string; idle: string; descActive: string }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const active = value === o;
        const c = colors?.[o];
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(active ? null : o)}
            aria-pressed={active}
            className={cn(
              'flex flex-col items-start gap-0.5 rounded-md border px-3 py-2.5 text-left transition-all',
              active
                ? (c?.active ?? 'border-accent bg-accent text-accent-foreground shadow-sm ring-2 ring-accent/40 ring-offset-1 ring-offset-background')
                : (c?.idle ?? 'border-border bg-muted/10 text-foreground hover:border-accent/40 hover:bg-muted/30'),
            )}
          >
            <span className="text-sm font-bold">
              {labels[o]}
            </span>
            <span className={cn('text-[11px] leading-snug', active ? (c?.descActive ?? 'text-accent-foreground/80') : 'text-muted-foreground')}>
              {descriptions[o]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface Props {
  deal: Deal;
}

const LOGO_ACCEPT = 'image/png,image/jpeg,image/jpg,image/svg+xml,image/webp';
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

function CompanyIdentityHeader({
  companyId,
  legalName,
  tradeName,
  cnpj,
  logoUrl,
  onSave,
}: {
  companyId: string;
  legalName: string;
  tradeName: string | null;
  cnpj: string | null;
  logoUrl: string | null;
  onSave: (updates: Record<string, unknown>) => void;
}) {
  const [legal, setLegal] = useState(legalName);
  const [trade, setTrade] = useState(tradeName ?? '');
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setLegal(legalName); }, [legalName]);
  useEffect(() => { setTrade(tradeName ?? ''); }, [tradeName]);

  const initials = (legalName || 'EM')
    .split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'EM';

  async function handleFile(file: File) {
    if (file.size > LOGO_MAX_BYTES) {
      toast.error('Logo deve ter no máximo 2MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${companyId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('company-logos')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('company-logos').getPublicUrl(path);
      onSave({ logo_url: data.publicUrl });
      toast.success('Logo atualizada');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar logo');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mb-5 flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-start">
      {/* Logo */}
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/30 flex items-center justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt={`Logo ${legalName}`} className="h-full w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
              <Building2 className="h-5 w-5" />
              <span className="text-[10px] font-bold tracking-wider">{initials}</span>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={LOGO_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Upload className="h-3 w-3" />}
            {logoUrl ? 'Trocar' : 'Enviar'}
          </Button>
          {logoUrl && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-1.5 text-destructive"
              onClick={() => onSave({ logo_url: null })}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Nomes + CNPJ */}
      <div className="flex-1 space-y-2">
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Razão social
          </Label>
          <Input
            value={legal}
            onChange={(e) => setLegal(e.target.value)}
            onBlur={() => {
              const v = legal.trim();
              if (!v) { setLegal(legalName); toast.error('Razão social é obrigatória'); return; }
              if (v !== legalName) onSave({ legal_name: v });
            }}
            className="h-9 bg-background/60 text-base font-semibold"
            placeholder="Razão social"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Nome fantasia
          </Label>
          <Input
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            onBlur={() => {
              const v = trade.trim();
              const current = tradeName ?? '';
              if (v !== current) onSave({ trade_name: v || null });
            }}
            className="h-9 bg-background/60"
            placeholder="Nome fantasia (opcional)"
          />
        </div>
        {cnpj && (
          <div className="text-[11px] text-muted-foreground font-mono">
            CNPJ: {cnpj}
          </div>
        )}
      </div>
    </div>
  );
}

export function ZoneCliente({ deal }: Props) {
  const { data: company, isLoading } = useCompanyDetail(deal.company_id);
  const updateCompany = useUpdateCompanyField(deal.company_id);
  const updateDeal = useUpdateDealField(deal.code);

  const saveCompany = (updates: Record<string, unknown>) => {
    if (!company) return;
    updateCompany.mutate(
      { companyId: company.id, updates: updates as any },
      { onError: (err: any) => toast.error(`Erro: ${err?.message ?? 'falhou'}`) },
    );
  };

  const setPrimaryContact = (personId: string | null) => {
    updateDeal.mutate(
      { id: deal.id, updates: { contact_person_id: personId } },
      { onError: (err: any) => toast.error(`Erro: ${err?.message ?? 'falhou'}`) },
    );
  };

  if (isLoading || !company) {
    return (
      <section id="zona-cliente" className="scroll-mt-24 rounded-lg border border-border bg-card/30 p-5">
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </section>
    );
  }

  return (
    <section id="zona-cliente" className="scroll-mt-24 rounded-lg border border-border bg-card/30 p-5">
      <header className="mb-4 flex items-baseline gap-3 border-b border-border/60 pb-3">
        <span className="font-mono text-xs text-muted-foreground">01</span>
        <h2 className="text-base font-semibold tracking-tight text-foreground">Cliente & Empresa</h2>
        <span className="text-xs text-muted-foreground">Quem é, em que mercado, com quem falamos</span>
      </header>

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel hint="raiz › sub">Setor da empresa</FieldLabel>
            <SectorPicker
              value={company.sector_id}
              onChange={(id) => saveCompany({ sector_id: id })}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Faixa de faturamento</FieldLabel>
            <Select
              value={company.revenue_range ?? '__none'}
              onValueChange={(v) => saveCompany({ revenue_range: v === '__none' ? null : (v as CompanyRevenueRange) })}
            >
              <SelectTrigger className="bg-background/60">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— não informado —</SelectItem>
                {REVENUE_RANGE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>{REVENUE_RANGE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel hint="quem compra do cliente">Tipo de cliente</FieldLabel>
          <ClientTypeCards<CompanyClientType>
            options={CLIENT_TYPE_OPTIONS}
            value={company.client_type}
            onChange={(v) => saveCompany({ client_type: v })}
            labels={CLIENT_TYPE_LABEL}
            descriptions={CLIENT_TYPE_DESCRIPTION}
            colors={CLIENT_TYPE_COLOR}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel hint="o quanto a empresa já usa tecnologia">Maturidade digital</FieldLabel>
          <MaturityScale
            value={company.digital_maturity}
            onSave={(v) => saveCompany({ digital_maturity: v })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel hint="estrela = contato principal do deal">Contatos & papéis</FieldLabel>
          <CompanyContactsManager
            companyId={company.id}
            primaryContactId={deal.contact_person_id}
            onMakePrimary={setPrimaryContact}
          />
        </div>
      </div>
    </section>
  );
}
