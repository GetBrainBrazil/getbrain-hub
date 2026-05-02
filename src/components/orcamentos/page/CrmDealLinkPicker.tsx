/**
 * CrmDealLinkPicker — vincula uma proposta a um deal do CRM e oferece o botão
 * "Importar dados deste deal" para popular os campos da proposta com:
 *   - Identidade do cliente (nome, cidade) via company
 *   - Narrativa: pain_context (a partir de pain_description), solution_overview
 *     (a partir de scope_summary/scope_in), executive_summary (a partir de
 *     business_context)
 *   - Escopo: scope_bullets (jsonb) → ScopeItem[]; fallback p/ deliverables[]
 *   - Manutenção: estimated_mrr_value
 *   - Validade: discount_valid_until ou +30 dias
 *
 * Mostra um diff resumido antes de aplicar (campos sobrescritos vs vazios).
 */
import { useEffect, useMemo, useState } from "react";
import { Search, Link2, Unlink, Sparkles, Loader2, ChevronRight, X, ExternalLink, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useUpdateProposal } from "@/hooks/orcamentos/useUpdateProposal";
import type { ScopeItem } from "@/lib/orcamentos/calculateTotal";

const DEAL_STAGE_LABEL: Record<string, string> = {
  descoberta_marcada: "Descoberta marcada",
  descobrindo: "Descobrindo",
  proposta_na_mesa: "Proposta na mesa",
  ajustando: "Ajustando",
  ganho: "Ganho",
  perdido: "Perdido",
  gelado: "Gelado",
};

interface DealRow {
  id: string;
  code: string;
  title: string;
  stage: string;
  company_id: string;
  estimated_value: number | null;
  pain_description: string | null;
  business_context: string | null;
  scope_summary: string | null;
  scope_in: string | null;
  scope_bullets: any;
  deliverables: string[];
  estimated_mrr_value: number | null;
  estimated_implementation_value: number | null;
  discount_valid_until: string | null;
  installments_count: number | null;
  first_installment_date: string | null;
  mrr_start_trigger: string | null;
  mrr_start_date: string | null;
  mrr_duration_months: number | null;
  mrr_discount_value: number | null;
  mrr_discount_months: number | null;
  company?: {
    id: string;
    trade_name: string | null;
    legal_name: string;
    logo_url: string | null;
  } | null;
}

interface DealLinkLite {
  id: string;
  code: string;
  title: string;
  stage?: string;
}

interface Props {
  proposalId: string;
  currentDeal: DealLinkLite | null;
  setField: (field: any, value: any) => void;
  setItems: (items: ScopeItem[]) => void;
  onLinkChanged?: () => void;
}

export function CrmDealLinkPicker({
  proposalId,
  currentDeal,
  setField,
  setItems,
  onLinkChanged,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importDeal, setImportDeal] = useState<DealRow | null>(null);
  const update = useUpdateProposal();

  // Debounce 250ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Busca de deals (top 12)
  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const q = supabase
        .from("deals")
        .select(
          "id, code, title, stage, company_id, estimated_value, pain_description, business_context, scope_summary, scope_in, scope_bullets, deliverables, estimated_mrr_value, estimated_implementation_value, discount_valid_until, installments_count, first_installment_date, company:companies(id, trade_name, legal_name, logo_url)",
        )
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(12);

      if (debounced) {
        q.or(`title.ilike.%${debounced}%,code.ilike.%${debounced}%`);
      }
      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        toast.error("Erro ao buscar deals");
        setResults([]);
      } else {
        setResults((data as any[]) || []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pickerOpen, debounced]);

  async function handleLink(deal: DealRow) {
    try {
      await update.mutateAsync({
        id: proposalId,
        payload: { deal_id: deal.id, company_id: deal.company_id },
      });
      toast.success(`Vinculado ao deal ${deal.code}`);
      setPickerOpen(false);
      onLinkChanged?.();
      // Abre dialog de importação na sequência
      setTimeout(() => setImportDeal(deal), 250);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao vincular");
    }
  }

  async function handleUnlink() {
    try {
      await update.mutateAsync({
        id: proposalId,
        payload: { deal_id: null },
      });
      toast.success("Vínculo removido");
      onLinkChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao desvincular");
    }
  }

  async function openImportDialog() {
    if (!currentDeal) return;
    // Carrega deal completo
    const { data, error } = await supabase
      .from("deals")
      .select(
        "id, code, title, stage, company_id, estimated_value, pain_description, business_context, scope_summary, scope_in, scope_bullets, deliverables, estimated_mrr_value, estimated_implementation_value, discount_valid_until, installments_count, first_installment_date, company:companies(id, trade_name, legal_name, logo_url)",
      )
      .eq("id", currentDeal.id)
      .maybeSingle();
    if (error || !data) {
      toast.error("Não foi possível carregar dados do deal");
      return;
    }
    setImportDeal(data as any);
  }

  return (
    <>
      <Card className="p-4 space-y-3 border-accent/30 bg-accent/5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <Link2 className="h-3 w-3" />
              Vínculo com CRM
            </p>
            {currentDeal ? (
              <p className="text-sm">
                <a
                  href={`/crm/deals/${currentDeal.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-accent hover:underline"
                >
                  {currentDeal.code}
                </a>
                <span className="mx-1.5 text-muted-foreground">·</span>
                <span className="text-foreground">{currentDeal.title}</span>
                {currentDeal.stage && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {DEAL_STAGE_LABEL[currentDeal.stage] || currentDeal.stage}
                  </Badge>
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Vincule a um deal do CRM para puxar contexto, dor, escopo e valores
                automaticamente.
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {currentDeal && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-8"
                  onClick={openImportDialog}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Importar dados
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-muted-foreground hover:text-destructive"
                  onClick={handleUnlink}
                  disabled={update.isPending}
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button type="button" size="sm" variant={currentDeal ? "outline" : "default"} className="h-8">
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  {currentDeal ? "Trocar deal" : "Vincular deal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] p-2" align="end">
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por título ou código (DEAL-...)"
                    className="h-9 pl-7 text-sm"
                  />
                </div>
                <div className="max-h-[320px] overflow-y-auto space-y-0.5">
                  {loading && (
                    <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Carregando…
                    </div>
                  )}
                  {!loading && results.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Nenhum deal encontrado.
                    </p>
                  )}
                  {!loading &&
                    results.map((d) => {
                      const isCurrent = currentDeal?.id === d.id;
                      const companyName =
                        d.company?.trade_name || d.company?.legal_name || "—";
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => handleLink(d)}
                          disabled={isCurrent || update.isPending}
                          className="w-full text-left rounded-md p-2 hover:bg-muted/60 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {d.code}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 h-4"
                              >
                                {DEAL_STAGE_LABEL[d.stage] || d.stage}
                              </Badge>
                              {isCurrent && (
                                <Badge className="text-[9px] px-1 py-0 h-4 bg-accent/20 text-accent">
                                  atual
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium truncate mt-0.5">
                              {d.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {companyName}
                            </p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                        </button>
                      );
                    })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>

      <ImportDealDialog
        deal={importDeal}
        onClose={() => setImportDeal(null)}
        setField={setField}
        setItems={setItems}
      />
    </>
  );
}

// ──────────── Dialog de importação com checkboxes ────────────
function ImportDealDialog({
  deal,
  onClose,
  setField,
  setItems,
}: {
  deal: DealRow | null;
  onClose: () => void;
  setField: (f: any, v: any) => void;
  setItems: (items: ScopeItem[]) => void;
}) {
  const [sel, setSel] = useState<Record<string, boolean>>({});

  // Recalcula seleções padrão quando o deal muda
  const sections = useMemo(() => {
    if (!deal) return [];
    const companyName = deal.company?.trade_name || deal.company?.legal_name || "";
    const scopeItems = parseScopeItems(deal);

    return [
      {
        key: "title",
        label: "Título da proposta",
        preview: deal.title,
        available: !!deal.title,
        apply: () => setField("title", deal.title),
      },
      {
        key: "client",
        label: "Identidade do cliente (nome)",
        preview: companyName,
        available: !!companyName,
        apply: () => setField("clientName", companyName),
      },
      {
        key: "logo",
        label: "Logo do cliente",
        preview: deal.company?.logo_url || null,
        available: !!deal.company?.logo_url,
        apply: () => setField("clientLogoUrl", deal.company?.logo_url || null),
      },
      {
        key: "pain",
        label: "Contexto e dor",
        preview: deal.pain_description,
        available: !!deal.pain_description,
        apply: () => setField("painContext", deal.pain_description || ""),
      },
      {
        key: "business",
        label: "Resumo executivo (do contexto comercial)",
        preview: deal.business_context,
        available: !!deal.business_context,
        apply: () => setField("executiveSummary", deal.business_context || ""),
      },
      {
        key: "solution",
        label: "Visão da solução (do escopo macro)",
        preview: deal.scope_summary || deal.scope_in,
        available: !!(deal.scope_summary || deal.scope_in),
        apply: () => setField("solutionOverview", deal.scope_summary || deal.scope_in || ""),
      },
      {
        key: "scope_items",
        label: `Módulos inclusos (${scopeItems.length})`,
        preview: scopeItems.map((i) => `• ${i.title}`).join("\n"),
        available: scopeItems.length > 0,
        apply: () => setItems(scopeItems),
      },
      {
        key: "implementation_value",
        label: "Investimento (implementação)",
        preview: deal.estimated_implementation_value
          ? `R$ ${Number(deal.estimated_implementation_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (one-time)`
          : null,
        available: !!deal.estimated_implementation_value,
        apply: () => setField("implementationValue", Number(deal.estimated_implementation_value)),
      },
      {
        key: "mrr",
        label: "Manutenção mensal (MRR estimado)",
        preview: deal.estimated_mrr_value
          ? `R$ ${Number(deal.estimated_mrr_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} / mês`
          : null,
        available: !!deal.estimated_mrr_value,
        apply: () => setField("maintenance", Number(deal.estimated_mrr_value)),
      },
      {
        key: "installments",
        label: "Parcelamento da implementação",
        preview: deal.installments_count
          ? `${deal.installments_count}× ${deal.first_installment_date ? `· 1ª parcela em ${deal.first_installment_date}` : ""}`
          : null,
        available: !!deal.installments_count,
        apply: () => {
          setField("installmentsCount", Number(deal.installments_count));
          if (deal.first_installment_date) {
            setField("firstInstallmentDate", deal.first_installment_date);
          }
        },
      },
      {
        key: "mrr_triggers",
        label: "Gatilhos do MRR (início, duração, desconto)",
        preview: (() => {
          const parts: string[] = [];
          if ((deal as any).mrr_start_trigger) parts.push(`Início: ${(deal as any).mrr_start_trigger}`);
          if ((deal as any).mrr_duration_months) parts.push(`Duração: ${(deal as any).mrr_duration_months} meses`);
          if ((deal as any).mrr_discount_value && (deal as any).mrr_discount_months)
            parts.push(`Desconto: R$ ${(deal as any).mrr_discount_value} × ${(deal as any).mrr_discount_months}m`);
          return parts.join(" · ") || null;
        })(),
        available: !!(
          (deal as any).mrr_start_trigger ||
          (deal as any).mrr_duration_months ||
          ((deal as any).mrr_discount_value && (deal as any).mrr_discount_months)
        ),
        apply: () => {
          if ((deal as any).mrr_start_trigger) setField("mrrStartTrigger", (deal as any).mrr_start_trigger);
          if ((deal as any).mrr_start_date) setField("mrrStartDate", (deal as any).mrr_start_date);
          if ((deal as any).mrr_duration_months) setField("mrrDurationMonths", Number((deal as any).mrr_duration_months));
          if ((deal as any).mrr_discount_value) setField("mrrDiscountValue", Number((deal as any).mrr_discount_value));
          if ((deal as any).mrr_discount_months) setField("mrrDiscountMonths", Number((deal as any).mrr_discount_months));
        },
      },
      {
        key: "valid",
        label: "Validade da proposta",
        preview: deal.discount_valid_until || "+30 dias a partir de hoje",
        available: true,
        apply: () =>
          setField(
            "validUntil",
            deal.discount_valid_until ||
              new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          ),
      },
    ];
  }, [deal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reseta seleção quando deal muda — todos os disponíveis marcados
  useEffect(() => {
    if (!deal) return;
    const initial: Record<string, boolean> = {};
    sections.forEach((s) => {
      initial[s.key] = s.available;
    });
    setSel(initial);
  }, [deal, sections]);

  if (!deal) return null;

  function applyAll() {
    let count = 0;
    sections.forEach((s) => {
      if (sel[s.key] && s.available) {
        s.apply();
        count++;
      }
    });
    toast.success(`${count} campo(s) importado(s) do deal ${deal!.code}`);
    onClose();
  }

  const totalSelected = Object.values(sel).filter(Boolean).length;

  return (
    <Dialog open={!!deal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            Importar dados do deal
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{deal.code}</span> · {deal.title}
            <span className="block text-[11px] mt-1">
              Selecione abaixo o que deve ser copiado para a proposta. Campos vazios na proposta serão preenchidos; campos com conteúdo serão substituídos.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
          {sections.map((s) => (
            <label
              key={s.key}
              className={`flex items-start gap-3 rounded-md p-2.5 cursor-pointer transition ${
                s.available
                  ? "hover:bg-muted/50"
                  : "opacity-50 cursor-not-allowed"
              }`}
            >
              <Checkbox
                checked={!!sel[s.key]}
                onCheckedChange={(v) => setSel((prev) => ({ ...prev, [s.key]: !!v }))}
                disabled={!s.available}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{s.label}</p>
                {s.available ? (
                  <p className="text-[11px] text-muted-foreground line-clamp-3 whitespace-pre-line mt-0.5">
                    {s.preview || <em>Vazio</em>}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic mt-0.5">
                    Não disponível neste deal
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            <X className="h-3.5 w-3.5 mr-1" />
            Cancelar
          </Button>
          <Button type="button" onClick={applyAll} disabled={totalSelected === 0}>
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Importar {totalSelected} campo(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Converte os dados de escopo do deal em ScopeItem[].
 * Prioridade:
 *  1. scope_bullets (jsonb) — pode ser [{title,description,value}] OU [string]
 *  2. deliverables (text[]) — só títulos, valor 0
 */
function parseScopeItems(deal: DealRow): ScopeItem[] {
  const items: ScopeItem[] = [];

  // 1) scope_bullets (jsonb)
  if (Array.isArray(deal.scope_bullets) && deal.scope_bullets.length > 0) {
    deal.scope_bullets.forEach((b: any) => {
      if (typeof b === "string" && b.trim()) {
        items.push({ title: b.trim(), description: "", value: 0 });
      } else if (b && typeof b === "object") {
        const title = (b.title || b.name || b.label || "").toString().trim();
        if (!title) return;
        items.push({
          title,
          description: (b.description || b.desc || "").toString(),
          value: Number(b.value || b.price || 0),
        });
      }
    });
  }

  // 2) Fallback: deliverables[]
  if (items.length === 0 && Array.isArray(deal.deliverables)) {
    deal.deliverables.forEach((d) => {
      if (typeof d === "string" && d.trim()) {
        items.push({ title: d.trim(), description: "", value: 0 });
      }
    });
  }

  // NÃO distribuir o valor da implementação entre os itens — o
  // estimated_implementation_value do CRM é o preço cheio do projeto, não a
  // soma de itens precificados. Os itens são descrições do escopo (deliverables
  // ou scope_bullets) e ficam sem valor a menos que o vendedor tenha cadastrado
  // value > 0 nos scope_bullets.
  return items;
}
