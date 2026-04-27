import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SectorPicker } from './SectorPicker';
import { CompanyContactsManager } from './CompanyContactsManager';
import {
  CLIENT_TYPE_LABEL, CLIENT_TYPE_OPTIONS, CLIENT_TYPE_COLOR,
  REVENUE_RANGE_LABEL, REVENUE_RANGE_OPTIONS, DIGITAL_MATURITY_LABEL,
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

function MaturitySlider({ value, onSave }: { value: number | null; onSave: (v: number) => void }) {
  const [local, setLocal] = useState<number>(value ?? 3);
  useEffect(() => { setLocal(value ?? 3); }, [value]);
  return (
    <div className="rounded-md border border-input bg-background/60 px-3 py-2.5">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-lg font-semibold text-accent">{local}</span>
        <span className="text-[11px] text-muted-foreground">{DIGITAL_MATURITY_LABEL[local]}</span>
      </div>
      <Slider
        min={1} max={5} step={1}
        value={[local]}
        onValueChange={([v]) => setLocal(v)}
        onValueCommit={([v]) => onSave(v)}
      />
    </div>
  );
}

interface Props {
  deal: Deal;
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

  const setPrimaryContact = (personId: string) => {
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
          <FieldLabel>Tipo de cliente</FieldLabel>
          <ChipGroup<CompanyClientType>
            options={CLIENT_TYPE_OPTIONS}
            value={company.client_type}
            onChange={(v) => saveCompany({ client_type: v })}
            labels={CLIENT_TYPE_LABEL}
            colors={CLIENT_TYPE_COLOR}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel hint="1 = inicial · 5 = líder digital">Maturidade digital</FieldLabel>
          <MaturitySlider
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
