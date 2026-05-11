import { useEffect, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronDown, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { maskCurrencyBRL, parseCurrencyBRL } from "@/lib/formatters";
import { CategoriesManagerDialog } from "./CategoriesManagerDialog";
import {
  CatalogProduct,
  CatalogPriceMode,
  CatalogSaleType,
  CatalogPaymentTerms,
  PRICE_MODE_LABEL,
  SALE_TYPE_LABEL,
  PAYMENT_TERMS_LABEL,
  STATUS_LABEL,
  BILLING_UNITS,
  useCatalogCategories,
} from "@/hooks/catalogo/useCatalog";

export type ProductFormValues = Partial<CatalogProduct> & {
  name: string;
  sale_type: CatalogSaleType;
  price_mode: CatalogPriceMode;
};

export const emptyProductForm: ProductFormValues = {
  name: "",
  pitch: "",
  description: "",
  tags: [],
  category_id: null,
  image_url: "",
  sale_type: "one_shot",
  price_mode: "fixed",
  price_value: null,
  price_min: null,
  price_max: null,
  billing_unit: "unica",
  default_payment_terms: "unica",
  default_quantity: 1,
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

export function ProductForm({ value, onChange, errors = {} }: Props) {
  const { data: categories = [] } = useCatalogCategories();
  const [catDialog, setCatDialog] = useState(false);
  const [tagsInput, setTagsInput] = useState((value.tags ?? []).join(", "));

  useEffect(() => {
    setTagsInput((value.tags ?? []).join(", "));
  }, [value.tags]);

  const setField = <K extends keyof ProductFormValues>(k: K, v: ProductFormValues[K]) =>
    onChange({ [k]: v } as any);

  const isFixedOrSuggested = value.price_mode === "fixed" || value.price_mode === "suggested";
  const isRange = value.price_mode === "range";

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

      {/* 2. Tipo de venda */}
      <Section title="Tipo de venda">
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(SALE_TYPE_LABEL) as CatalogSaleType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setField("sale_type", t)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                value.sale_type === t
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/40",
              )}
            >
              <div className="text-sm font-semibold">{SALE_TYPE_LABEL[t]}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {t === "saas" && "Produto digital cobrado mensal/anual."}
                {t === "recurring_service" && "Serviço prestado repetidamente."}
                {t === "one_shot" && "Projeto fechado com início e fim."}
                {t === "custom" && "Escopo e preço definidos a cada venda."}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* 3. Modo de preço */}
      <Section title="Modo de preço">
        <div>
          <Label>Como o vendedor pode usar o preço *</Label>
          <Select value={value.price_mode} onValueChange={(v) => setField("price_mode", v as CatalogPriceMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PRICE_MODE_LABEL) as CatalogPriceMode[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {PRICE_MODE_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {value.price_mode === "fixed" && "O vendedor NÃO pode mudar o valor."}
            {value.price_mode === "suggested" && "O vendedor pode ajustar o valor para mais ou para menos."}
            {value.price_mode === "range" && "O vendedor escolhe um valor entre o mínimo e o máximo."}
            {value.price_mode === "on_request" && "Sem valor cadastrado. O vendedor define a cada venda."}
          </p>
        </div>

        {isFixedOrSuggested && (
          <div>
            <Label>Valor *</Label>
            <Input
              value={value.price_value != null ? maskCurrencyBRL(String(Math.round(value.price_value * 100))) : ""}
              onChange={(e) => setField("price_value", parseCurrencyBRL(e.target.value))}
              placeholder="R$ 0,00"
              className={errors.price_value ? "border-destructive" : ""}
            />
            {errors.price_value && <p className="text-xs text-destructive mt-1">{errors.price_value}</p>}
          </div>
        )}

        {isRange && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Mínimo *</Label>
              <Input
                value={value.price_min != null ? maskCurrencyBRL(String(Math.round(value.price_min * 100))) : ""}
                onChange={(e) => setField("price_min", parseCurrencyBRL(e.target.value))}
                placeholder="R$ 0,00"
                className={errors.price_min ? "border-destructive" : ""}
              />
              {errors.price_min && <p className="text-xs text-destructive mt-1">{errors.price_min}</p>}
            </div>
            <div>
              <Label>Máximo *</Label>
              <Input
                value={value.price_max != null ? maskCurrencyBRL(String(Math.round(value.price_max * 100))) : ""}
                onChange={(e) => setField("price_max", parseCurrencyBRL(e.target.value))}
                placeholder="R$ 0,00"
                className={errors.price_max ? "border-destructive" : ""}
              />
              {errors.price_max && <p className="text-xs text-destructive mt-1">{errors.price_max}</p>}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Unidade de cobrança</Label>
            <Select value={value.billing_unit} onValueChange={(v) => setField("billing_unit", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Forma de pagamento padrão</Label>
            <Select
              value={value.default_payment_terms}
              onValueChange={(v) => setField("default_payment_terms", v as CatalogPaymentTerms)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_TERMS_LABEL) as CatalogPaymentTerms[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {PAYMENT_TERMS_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantidade padrão</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={value.default_quantity ?? 1}
              onChange={(e) => setField("default_quantity", Number(e.target.value) || 0)}
            />
          </div>
        </div>
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
