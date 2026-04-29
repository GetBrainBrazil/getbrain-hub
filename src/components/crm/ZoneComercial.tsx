import { useEffect, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { CurrencyInput, IntegerInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateDealField } from '@/hooks/crm/useCrmDetails';
import { cn } from '@/lib/utils';
import type { Deal } from '@/types/crm';

const PROJECT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'planning',           label: 'Planejamento' },
  { value: 'em_desenvolvimento', label: 'Em desenvolvimento' },
  { value: 'em_homologacao',     label: 'Em homologação' },
  { value: 'entregue',           label: 'Entregue' },
  { value: 'em_manutencao',      label: 'Em manutenção' },
];

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</Label>
      {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
    </div>
  );
}

function InlineMoney({
  value, onSave, placeholder,
}: { value: number | null; onSave: (v: number | null) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value === null ? '' : String(value));
  useEffect(() => { setLocal(value === null ? '' : String(value)); }, [value]);
  const commit = () => {
    const t = local.trim();
    if (t === '') { if (value !== null) onSave(null); return; }
    const n = Number(t);
    if (Number.isFinite(n) && n !== value) onSave(n);
  };
  return (
    <CurrencyInput
      value={local}
      onValueChange={setLocal}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
      placeholder={placeholder}
      withPrefix
    />
  );
}

function InlineText({
  value, onSave, placeholder, multiline = false, minHeight,
}: { value: string | null; onSave: (v: string | null) => void; placeholder?: string; multiline?: boolean; minHeight?: number }) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => { setLocal(value ?? ''); }, [value]);
  const commit = () => {
    const trimmed = local.trim();
    const next = trimmed === '' ? null : trimmed;
    if (next !== (value ?? null)) onSave(next);
  };
  if (multiline) {
    return (
      <RichTextEditor
        value={local}
        onChange={setLocal}
        onSave={(v) => {
          const trimmed = v.trim();
          const next = trimmed === '' ? null : trimmed;
          if (next !== (value ?? null)) onSave(next);
        }}
        placeholder={placeholder}
        minHeight={minHeight}
        autoFocus={false}
      />
    );
  }
  return (
    <Input
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
      className="bg-background/60"
    />
  );
}

function DatePickerInline({
  value, onSave, placeholder = 'Selecione...',
}: { value: string | null; onSave: (v: string | null) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T12:00:00`) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-9 w-full justify-start gap-2 bg-background/60 font-normal',
            !date && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {date ? format(date, "dd 'de' MMM 'de' yyyy", { locale: ptBR }) : placeholder}
          {value && (
            <span
              role="button"
              aria-label="Limpar data"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onSave(null); }}
              className="ml-auto rounded text-[10px] text-muted-foreground hover:text-destructive"
            >
              limpar
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onSave(d ? format(d, 'yyyy-MM-dd') : null);
            setOpen(false);
          }}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}

function ProbabilitySlider({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [local, setLocal] = useState<number>(value);
  useEffect(() => { setLocal(value); }, [value]);
  return (
    <div className="rounded-md border border-input bg-background/60 px-3 py-2.5">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-lg font-semibold text-accent">{local}%</span>
        <span className="text-[11px] text-muted-foreground">probabilidade de fechamento</span>
      </div>
      <Slider
        min={0} max={100} step={5}
        value={[local]}
        onValueChange={([v]) => setLocal(v)}
        onValueCommit={([v]) => onSave(v)}
      />
    </div>
  );
}

export function ZoneComercial({ deal }: { deal: Deal }) {
  const update = useUpdateDealField(deal.code);
  const save = (updates: Partial<Deal>) => {
    update.mutate(
      { id: deal.id, updates },
      { onError: (err: any) => toast.error(`Erro: ${err?.message ?? 'falhou'}`) },
    );
  };

  return (
    <section id="zona-comercial" className="scroll-mt-24 rounded-lg border border-border bg-card/30 p-5">
      <header className="mb-4 flex items-baseline gap-3 border-b border-border/60 pb-3">
        <span className="font-mono text-xs text-muted-foreground">05</span>
        <h2 className="text-base font-semibold tracking-tight text-foreground">Comercial & Decisão</h2>
        <span className="text-xs text-muted-foreground">Valor, prazos, próximo passo</span>
      </header>

      <div className="space-y-5">
        {/* Valores */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel hint="cobrança única (one-time)">Valor de implementação</FieldLabel>
            <InlineMoney
              value={deal.estimated_implementation_value}
              onSave={(v) => save({ estimated_implementation_value: v })}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel hint="receita recorrente mensal">Recorrência (MRR)</FieldLabel>
            <InlineMoney
              value={deal.estimated_mrr_value}
              onSave={(v) => save({ estimated_mrr_value: v })}
              placeholder="R$ 0,00"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel>Budget mínimo do cliente</FieldLabel>
            <InlineMoney
              value={deal.budget_range_min}
              onSave={(v) => save({ budget_range_min: v })}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Budget máximo do cliente</FieldLabel>
            <InlineMoney
              value={deal.budget_range_max}
              onSave={(v) => save({ budget_range_max: v })}
              placeholder="R$ 0,00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel>Probabilidade</FieldLabel>
          <ProbabilitySlider
            value={deal.probability_pct ?? 0}
            onSave={(v) => save({ probability_pct: v })}
          />
        </div>

        {/* Datas */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <FieldLabel>Fecha em</FieldLabel>
            <DatePickerInline
              value={deal.expected_close_date}
              onSave={(v) => save({ expected_close_date: v })}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Início desejado</FieldLabel>
            <DatePickerInline
              value={deal.desired_start_date}
              onSave={(v) => save({ desired_start_date: v })}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Entrega desejada</FieldLabel>
            <DatePickerInline
              value={deal.desired_delivery_date}
              onSave={(v) => save({ desired_delivery_date: v })}
            />
          </div>
        </div>

        {/* Concorrência + proposta */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel hint="quem mais está disputando">Concorrentes</FieldLabel>
            <InlineText
              value={deal.competitors}
              onSave={(v) => save({ competitors: v })}
              placeholder="Ex: Solução interna, Empresa X..."
            />
          </div>
          <div className="space-y-2">
            <FieldLabel hint="link da proposta enviada">URL da proposta</FieldLabel>
            <InlineText
              value={deal.proposal_url}
              onSave={(v) => save({ proposal_url: v })}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel hint="por que esse preço — por valor, por hora, por escopo...">Justificativa do preço</FieldLabel>
          <InlineText
            value={deal.pricing_rationale}
            onSave={(v) => save({ pricing_rationale: v })}
            placeholder="Ex: Precificado por valor — economia de R$ 30k/mês, payback em 4 meses..."
            multiline
            minHeight={90}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel>Decisores</FieldLabel>
          <InlineText
            value={deal.decision_makers}
            onSave={(v) => save({ decision_makers: v })}
            placeholder="Quem aprova o orçamento, quem assina..."
            multiline
            minHeight={70}
          />
        </div>

        {/* Próximo passo */}
        <div className="rounded-md border border-accent/30 bg-accent/5 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-accent">Próximo passo</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <FieldLabel>O que fazer</FieldLabel>
              <InlineText
                value={deal.next_step}
                onSave={(v) => save({ next_step: v })}
                placeholder="Ex: Mandar versão revisada da proposta com escopo enxugado"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Quando</FieldLabel>
              <DatePickerInline
                value={deal.next_step_date}
                onSave={(v) => save({ next_step_date: v })}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
