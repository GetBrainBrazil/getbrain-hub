import { useEffect, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Settings2,
  Box,
  Wrench,
  Cloud,
  Layers,
  Combine,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { maskCurrencyBRL, parseCurrencyBRL } from "@/lib/formatters";
import { CategoriesManagerDialog } from "./CategoriesManagerDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  CatalogProduct,
  CatalogPriceMode,
  CatalogSaleType,
  CatalogArchetype,
  CatalogOneShotTerms,
  ARCHETYPE_LABEL,
  ARCHETYPE_HINT,
  ONESHOT_TERMS_OPTIONS,
  STATUS_LABEL,
  useCatalogCategories,
} from "@/hooks/catalogo/useCatalog";

export type ProductFormValues = Partial<CatalogProduct> & {
  name: string;
  archetype: CatalogArchetype;
};

export const emptyProductForm: ProductFormValues = {
  name: "",
  pitch: "",
  description: "",
  tags: [],
  category_id: null,
  image_url: "",
  // legados (mantidos por compat na escrita)
  sale_type: "one_shot" as CatalogSaleType,
  price_mode: "fixed" as CatalogPriceMode,
  price_value: null,
  price_min: null,
  price_max: null,
  billing_unit: "unica",
  default_payment_terms: "unica",
  default_quantity: 1,
  // novo modelo
  archetype: "one_shot",
  setup_value: null,
  setup_adjustable: true,
  setup_payment_terms: "a_vista",
  oneshot_value: null,
  oneshot_adjustable: true,
  oneshot_payment_terms: "a_vista",
  recurring_value: null,
  recurring_adjustable: false,
  maintenance_required: "client_decides",
  status: "active",
  internal_notes: "",
};

interface Props {
  value: ProductFormValues;
  onChange: (patch: Partial<ProductFormValues>) => void;
  errors?: Record<string, string>;
}

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border bg-card/40">
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold">
        <span>{title}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-1 space-y-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const ARCHETYPE_ICON: Record<CatalogArchetype, React.ComponentType<{ className?: string }>> = {
  one_shot: Box,
  with_maintenance: Wrench,
  saas: Cloud,
  hybrid: Layers,
  aggregator: Combine,
};

function MoneyInput({
  value,
  onChange,
  error,
  placeholder = "R$ 0,00",
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <>
      <Input
        value={value != null ? maskCurrencyBRL(String(Math.round(Number(value) * 100))) : ""}
        onChange={(e) => onChange(parseCurrencyBRL(e.target.value))}
        placeholder={placeholder}
        className={cn("font-mono", error && "border-destructive")}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </>
  );
}

function AdjustableToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/40 px-3 py-2">
      <div>
        <div className="text-xs font-medium">Vendedor pode ajustar este preço?</div>
        <div className="text-[10px] text-muted-foreground">
          {checked ? "Sim — vendedor pode mudar na cesta." : "Não — preço travado."}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function PaymentTermsSelect({
  value,
  onChange,
}: {
  value: CatalogOneShotTerms;
  onChange: (v: CatalogOneShotTerms) => void;
}) {
  return (
    <div>
      <Label className="text-xs">Forma de pagamento padrão</Label>
      <Select value={value} onValueChange={(v) => onChange(v as CatalogOneShotTerms)}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ONESHOT_TERMS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[10px] text-muted-foreground mt-1">
        Vendedor pode mudar na cesta — isso é só o sugerido.
      </p>
    </div>
  );
}

function PriceBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/30 p-3 space-y-3">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export function ProductForm({ value, onChange, errors = {} }: Props) {
  const { isAdmin } = useAuth();
  const { data: categories = [] } = useCatalogCategories();
  const [catDialog, setCatDialog] = useState(false);
  const [tagsInput, setTagsInput] = useState((value.tags ?? []).join(", "));

  useEffect(() => {
    setTagsInput((value.tags ?? []).join(", "));
  }, [value.tags]);

  const setField = <K extends keyof ProductFormValues>(k: K, v: ProductFormValues[K]) =>
    onChange({ [k]: v } as any);

  // Quando o vendedor escolhe um arquétipo, sincronizamos sale_type/price_mode legados
  // só pra garantir consistência mínima na coluna antiga (compat).
  const setArchetype = (a: CatalogArchetype) => {
    const patch: Partial<ProductFormValues> = { archetype: a };
    if (a === "saas") { patch.sale_type = "saas"; patch.price_mode = "fixed"; }
    else if (a === "with_maintenance") { patch.sale_type = "recurring_service"; patch.price_mode = "suggested"; }
    else if (a === "one_shot") { patch.sale_type = "one_shot"; patch.price_mode = "fixed"; }
    else if (a === "hybrid") { patch.sale_type = "saas"; patch.price_mode = "fixed"; }
    else if (a === "aggregator") { patch.sale_type = "recurring_service"; patch.price_mode = "on_request"; }
    onChange(patch as any);
  };

  const archetypes: CatalogArchetype[] = ["one_shot", "with_maintenance", "saas", "hybrid"];
  if (isAdmin) archetypes.push("aggregator");

  return (
    <div className="space-y-3">
      {/* 1. Identificação */}
      <Section title="Identificação e apresentação">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Nome do produto *</Label>
            <Input
              value={value.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Ex: Implementação de Triagem IA"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div className="md:col-span-2">
            <Label>Pitch comercial</Label>
            <Input
              value={value.pitch ?? ""}
              onChange={(e) => setField("pitch", e.target.value)}
              placeholder="Ex: Reduz 70% do tempo de triagem com IA"
            />
            <p className="text-xs text-muted-foreground mt-1">Frase de impacto que o vendedor usa para apresentar o produto.</p>
          </div>
          <div className="md:col-span-2">
            <Label>Descrição completa</Label>
            <Textarea
              rows={4}
              value={value.description ?? ""}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Entregáveis, diferenciais, escopo padrão…"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Categoria *</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCatDialog(true)} className="h-6 text-xs">
                <Settings2 className="h-3 w-3 mr-1" /> Gerenciar
              </Button>
            </div>
            <Select
              value={value.category_id ?? ""}
              onValueChange={(v) => setField("category_id", v || null)}
            >
              <SelectTrigger className={errors.category_id ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma categoria. Crie em "Gerenciar".</div>}
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && <p className="text-xs text-destructive mt-1">{errors.category_id}</p>}
          </div>
          <div>
            <Label>URL da imagem (opcional)</Label>
            <Input
              value={value.image_url ?? ""}
              onChange={(e) => setField("image_url", e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Tags</Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onBlur={() =>
                setField(
                  "tags",
                  tagsInput
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .slice(0, 20),
                )
              }
              placeholder="IA, automação, recrutamento"
            />
            <p className="text-xs text-muted-foreground mt-1">Separadas por vírgula. Servem para busca e agrupamento.</p>
          </div>
        </div>
      </Section>

      {/* 2. Tipo de produto (arquétipo) */}
      <Section title="Tipo de produto">
        <div className="grid gap-3 sm:grid-cols-2">
          {archetypes.map((a) => {
            const Icon = ARCHETYPE_ICON[a];
            const active = value.archetype === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => setArchetype(a)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors flex gap-3 items-start",
                  active ? "border-accent bg-accent/10" : "border-border hover:border-accent/40",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                    active ? "bg-accent/20 text-accent" : "bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{ARCHETYPE_LABEL[a]}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{ARCHETYPE_HINT[a]}</div>
                  {a === "aggregator" && (
                    <div className="text-[10px] text-amber-400/80 mt-1">Visível só para admins.</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 3. Preço — dinâmico por arquétipo */}
      <Section title="Preço">
        {value.archetype === "aggregator" ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90 flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Este produto não tem preço próprio. Quando adicionado à cesta de uma proposta, o valor será
              calculado a partir dos outros itens da cesta (somando o valor de manutenção mensal sugerida
              de cada um, com possibilidade de opt-out por item).
            </p>
          </div>
        ) : value.archetype === "one_shot" ? (
          <PriceBlock title="Preço único" hint="Pagamento único pela entrega do serviço.">
            <div>
              <Label className="text-xs">Valor *</Label>
              <MoneyInput
                value={value.oneshot_value}
                onChange={(v) => setField("oneshot_value", v)}
                error={errors.oneshot_value}
              />
            </div>
            <AdjustableToggle
              checked={!!value.oneshot_adjustable}
              onChange={(v) => setField("oneshot_adjustable", v)}
            />
            <PaymentTermsSelect
              value={(value.oneshot_payment_terms ?? "a_vista") as CatalogOneShotTerms}
              onChange={(v) => setField("oneshot_payment_terms", v)}
            />
          </PriceBlock>
        ) : value.archetype === "saas" ? (
          <PriceBlock title="Mensalidade" hint="Cobrança mensal recorrente.">
            <div>
              <Label className="text-xs">Valor mensal *</Label>
              <MoneyInput
                value={value.recurring_value}
                onChange={(v) => setField("recurring_value", v)}
                error={errors.recurring_value}
              />
            </div>
            <AdjustableToggle
              checked={!!value.recurring_adjustable}
              onChange={(v) => setField("recurring_adjustable", v)}
            />
          </PriceBlock>
        ) : value.archetype === "hybrid" ? (
          <div className="space-y-3">
            <PriceBlock title="Setup (pagamento único)" hint="Onboarding/implementação inicial.">
              <div>
                <Label className="text-xs">Valor de setup *</Label>
                <MoneyInput
                  value={value.setup_value}
                  onChange={(v) => setField("setup_value", v)}
                  error={errors.setup_value}
                />
              </div>
              <AdjustableToggle
                checked={!!value.setup_adjustable}
                onChange={(v) => setField("setup_adjustable", v)}
              />
              <PaymentTermsSelect
                value={(value.setup_payment_terms ?? "a_vista") as CatalogOneShotTerms}
                onChange={(v) => setField("setup_payment_terms", v)}
              />
            </PriceBlock>
            <div className="border-t border-border/40" />
            <PriceBlock title="Mensalidade" hint="Cobrança mensal contínua.">
              <div>
                <Label className="text-xs">Valor mensal *</Label>
                <MoneyInput
                  value={value.recurring_value}
                  onChange={(v) => setField("recurring_value", v)}
                  error={errors.recurring_value}
                />
              </div>
              <AdjustableToggle
                checked={!!value.recurring_adjustable}
                onChange={(v) => setField("recurring_adjustable", v)}
              />
            </PriceBlock>
          </div>
        ) : (
          // with_maintenance
          <div className="space-y-3">
            <PriceBlock title="Setup (pagamento único)" hint="Implementação no cliente. Pode ficar zerado se não houver setup.">
              <div>
                <Label className="text-xs">Valor de setup</Label>
                <MoneyInput
                  value={value.setup_value}
                  onChange={(v) => setField("setup_value", v)}
                  error={errors.setup_value}
                />
              </div>
              <AdjustableToggle
                checked={!!value.setup_adjustable}
                onChange={(v) => setField("setup_adjustable", v)}
              />
              <PaymentTermsSelect
                value={(value.setup_payment_terms ?? "a_vista") as CatalogOneShotTerms}
                onChange={(v) => setField("setup_payment_terms", v)}
              />
            </PriceBlock>
            <div className="border-t border-border/40" />
            <PriceBlock title="Manutenção mensal sugerida (recorrente)" hint="Valor que será usado quando o produto Manutenção for adicionado à cesta.">
              <div>
                <Label className="text-xs">Valor mensal *</Label>
                <MoneyInput
                  value={value.recurring_value}
                  onChange={(v) => setField("recurring_value", v)}
                  error={errors.recurring_value}
                />
              </div>
              <AdjustableToggle
                checked={!!value.recurring_adjustable}
                onChange={(v) => setField("recurring_adjustable", v)}
              />
              <div>
                <Label className="text-xs">Obrigatoriedade pra fechar a venda</Label>
                <Select
                  value={value.maintenance_required ?? "client_decides"}
                  onValueChange={(v) => setField("maintenance_required", v as any)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client_decides">Cliente decide na proposta</SelectItem>
                    <SelectItem value="mandatory">Obrigatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PriceBlock>
          </div>
        )}
      </Section>

      {/* 4. Controle interno */}
      <Section title="Controle interno" defaultOpen={false}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Status</Label>
            <Select value={value.status} onValueChange={(v) => setField("status", v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Só os "Ativos" aparecem para o vendedor.</p>
          </div>
        </div>
        <div>
          <Label>Observações internas</Label>
          <Textarea
            rows={3}
            value={value.internal_notes ?? ""}
            onChange={(e) => setField("internal_notes", e.target.value)}
            placeholder="Não aparece para o cliente. Ex: margem mínima 30%, confirmar com Carlos antes de vender."
          />
        </div>
      </Section>

      <CategoriesManagerDialog open={catDialog} onOpenChange={setCatDialog} />
    </div>
  );
}
