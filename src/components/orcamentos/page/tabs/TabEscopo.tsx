/**
 * Tab "Escopo" — alinhada ao modelo comercial do CRM:
 *
 *  1. **Investimento (implementação)** — valor cheio do projeto + parcelamento.
 *     Espelha `deals.estimated_implementation_value` + `installments_count` +
 *     `first_installment_date`. NÃO é mais soma de itens.
 *
 *  2. **Módulos inclusos** — descrições do escopo (deliverables /
 *     scope_bullets). Sem coluna de preço por item por padrão; o vendedor pode
 *     ativar "exibir valor por módulo" caso queira detalhar.
 *
 *  3. **Manutenção mensal (MRR)** — valor + descrição + opcionalmente gatilho
 *     de início, duração e desconto inicial (espelha `mrr_*` do deal).
 *
 *  4. **Prazos** + **Considerações** + **Narrativa** (boas-vindas, resumo
 *     executivo, contexto/dor, visão da solução).
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight } from "lucide-react";
import { NotionItemsEditor } from "@/components/orcamentos/NotionItemsEditor";
import { ConsiderationsEditor } from "@/components/orcamentos/ConsiderationsEditor";
import { GerarComIaDropdown } from "@/components/orcamentos/GerarComIaDropdown";
import { GerarDescricoesIaButton } from "@/components/orcamentos/GerarDescricoesIaButton";
import { formatBRL, type ScopeItem } from "@/lib/orcamentos/calculateTotal";
import type { GenerationType } from "@/lib/orcamentos/generateContent";

interface Props {
  proposalId: string;
  hasDealLink: boolean;
  isLocked: boolean;
  state: {
    scopeItems: ScopeItem[];
    maintenance: number | "";
    maintenanceDesc: string;
    implementationDays: number;
    validationDays: number;
    considerations: string[];
    validUntil: string;
    welcomeMessage: string;
    executiveSummary: string;
    painContext: string;
    solutionOverview: string;
    implementationValue: number | "";
    installmentsCount: number | "";
    firstInstallmentDate: string;
    mrrStartTrigger: string;
    mrrStartDate: string;
    mrrDurationMonths: number | "";
    mrrDiscountValue: number | "";
    mrrDiscountMonths: number | "";
  };
  setField: (field: any, value: any) => void;
  setItems: (items: ScopeItem[]) => void;
  onOpenItemDetails: (idx: number) => void;
  dealPainDescription?: string | null;
  onAiGenerated: (type: GenerationType, content: any) => void;
}

const MRR_TRIGGER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "on_signature", label: "Na assinatura do contrato" },
  { value: "on_delivery", label: "Na entrega da implementação" },
  { value: "on_date", label: "Em data específica" },
];

export function TabEscopo({
  proposalId,
  hasDealLink,
  isLocked,
  state,
  setField,
  setItems,
  onOpenItemDetails,
  dealPainDescription,
  onAiGenerated,
}: Props) {
  const implValue = typeof state.implementationValue === "number" ? state.implementationValue : 0;
  const monthly =
    typeof state.maintenance === "number" && state.maintenance > 0 ? state.maintenance : 0;
  const installments = typeof state.installmentsCount === "number" ? state.installmentsCount : 0;
  const installmentValue = installments > 1 && implValue > 0 ? implValue / installments : 0;

  // MRR efetivo no 1º ano considerando desconto inicial
  const discValue =
    typeof state.mrrDiscountValue === "number" && state.mrrDiscountValue > 0
      ? state.mrrDiscountValue
      : 0;
  const discMonths =
    typeof state.mrrDiscountMonths === "number" && state.mrrDiscountMonths > 0
      ? state.mrrDiscountMonths
      : 0;
  const annualMrr =
    monthly > 0
      ? Math.max(monthly - discValue, 0) * Math.min(discMonths, 12) +
        monthly * Math.max(0, 12 - Math.min(discMonths, 12))
      : 0;

  // Algum item já tem valor cadastrado? Se sim, exibe coluna por padrão.
  const itemsHaveValues = state.scopeItems.some((it) => Number(it.value) > 0);
  const [showItemValues, setShowItemValues] = useState(itemsHaveValues);
  const [mrrAdvancedOpen, setMrrAdvancedOpen] = useState(
    !!(state.mrrStartTrigger || state.mrrDurationMonths || discValue > 0),
  );

  return (
    <div className="space-y-4 max-w-4xl">
      {/* ─── Investimento (implementação) ─── */}
      <Card className="p-4 space-y-4">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Investimento — Implementação
          </h3>
          <span className="text-[11px] text-muted-foreground">
            valor único (one-time) do projeto
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <Label className="text-[11px] text-muted-foreground">Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={state.implementationValue}
              onChange={(e) =>
                setField(
                  "implementationValue",
                  e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                )
              }
              className="h-10 mt-1 text-right tabular-nums font-mono text-base"
              placeholder="0,00"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Nº de parcelas</Label>
            <Input
              type="number"
              min="1"
              max="60"
              value={state.installmentsCount}
              onChange={(e) =>
                setField(
                  "installmentsCount",
                  e.target.value === ""
                    ? ""
                    : Math.min(60, Math.max(1, parseInt(e.target.value) || 1)),
                )
              }
              className="h-10 mt-1 tabular-nums"
              placeholder="1"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Data da 1ª parcela</Label>
            <Input
              type="date"
              value={state.firstInstallmentDate}
              onChange={(e) => setField("firstInstallmentDate", e.target.value)}
              className="h-10 mt-1"
            />
          </div>
        </div>

        {/* Preview ao vivo do parcelamento */}
        {implValue > 0 && (
          <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
            {installments > 1 && installmentValue > 0 ? (
              <div className="flex items-baseline gap-2 flex-wrap">
                <strong className="text-success tabular-nums">{formatBRL(implValue)}</strong>
                <span className="text-muted-foreground">em</span>
                <strong className="tabular-nums">
                  {installments}× {formatBRL(installmentValue)}
                </strong>
                {state.firstInstallmentDate && (
                  <span className="text-muted-foreground text-xs">
                    · 1ª em {new Date(`${state.firstInstallmentDate}T00:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <strong className="text-success tabular-nums">{formatBRL(implValue)}</strong>
                <span className="text-muted-foreground text-xs">à vista</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ─── Módulos inclusos ─── */}
      <Card className="p-4 space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div className="flex items-baseline gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Módulos inclusos
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {state.scopeItems.length} {state.scopeItems.length === 1 ? "módulo" : "módulos"}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <GerarDescricoesIaButton
              proposalId={proposalId}
              items={state.scopeItems}
              hasDealLink={hasDealLink}
              disabled={isLocked}
              onDescriptionsGenerated={setItems}
            />
            <button
              type="button"
              onClick={() => setShowItemValues((v) => !v)}
              className="text-[11px] text-accent hover:underline"
            >
              {showItemValues ? "Ocultar valor por módulo" : "Exibir valor por módulo"}
            </button>
          </div>
        </div>
        <NotionItemsEditor
          items={state.scopeItems}
          onChange={setItems}
          onOpenDetails={onOpenItemDetails}
          showItemValue={showItemValues}
        />
        {showItemValues && (
          <p className="text-[11px] text-muted-foreground">
            ⚠️ A soma dos módulos é informativa — o valor cobrado segue o
            <strong className="text-foreground"> Investimento (R$ {formatBRL(implValue)})</strong>{" "}
            acima.
          </p>
        )}
      </Card>

      {/* ─── Manutenção (MRR) ─── */}
      <Card className="p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Manutenção mensal (MRR){" "}
          <span className="text-muted-foreground/50 normal-case font-normal tracking-normal">
            (opcional)
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Descrição</Label>
            <Input
              value={state.maintenanceDesc}
              onChange={(e) => setField("maintenanceDesc", e.target.value)}
              placeholder="Tokens + Servidor + Desenvolvedor"
              className="h-9 mt-1"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Valor mensal (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={state.maintenance}
              onChange={(e) =>
                setField(
                  "maintenance",
                  e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                )
              }
              className="h-9 mt-1 text-right tabular-nums font-mono"
            />
          </div>
        </div>

        {/* Avançado: gatilho/duração/desconto */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setMrrAdvancedOpen((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
          >
            {mrrAdvancedOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Gatilho de início, duração e desconto inicial
          </button>
        </div>

        {mrrAdvancedOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/40">
            <div>
              <Label className="text-[11px] text-muted-foreground">Quando inicia a cobrança</Label>
              <Select
                value={state.mrrStartTrigger || "none"}
                onValueChange={(v) => setField("mrrStartTrigger", v === "none" ? "" : v)}
              >
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— sem definição</SelectItem>
                  {MRR_TRIGGER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {state.mrrStartTrigger === "on_date" && (
              <div>
                <Label className="text-[11px] text-muted-foreground">Data de início</Label>
                <Input
                  type="date"
                  value={state.mrrStartDate}
                  onChange={(e) => setField("mrrStartDate", e.target.value)}
                  className="h-9 mt-1"
                />
              </div>
            )}
            <div>
              <Label className="text-[11px] text-muted-foreground">Duração (meses, opcional)</Label>
              <Input
                type="number"
                min="0"
                value={state.mrrDurationMonths}
                onChange={(e) =>
                  setField(
                    "mrrDurationMonths",
                    e.target.value === "" ? "" : parseInt(e.target.value) || 0,
                  )
                }
                className="h-9 mt-1 tabular-nums"
                placeholder="Indeterminado"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">Desconto (R$/mês)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={state.mrrDiscountValue}
                  onChange={(e) =>
                    setField(
                      "mrrDiscountValue",
                      e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                    )
                  }
                  className="h-9 mt-1 text-right tabular-nums font-mono"
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Por quantos meses</Label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  value={state.mrrDiscountMonths}
                  onChange={(e) =>
                    setField(
                      "mrrDiscountMonths",
                      e.target.value === "" ? "" : parseInt(e.target.value) || 0,
                    )
                  }
                  className="h-9 mt-1 tabular-nums"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

        {monthly > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Receita do 1º ano:{" "}
            <strong className="text-foreground tabular-nums">{formatBRL(annualMrr)}</strong>
            {discValue > 0 && discMonths > 0 && (
              <span className="ml-2 text-accent">
                (com {formatBRL(discValue)} de desconto nos {discMonths} primeiros meses)
              </span>
            )}
          </p>
        )}
      </Card>

      {/* ─── Prazos ─── */}
      <Card className="p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Prazos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Implementação (dias)</Label>
            <Input
              type="number"
              min="0"
              value={state.implementationDays}
              onChange={(e) => setField("implementationDays", parseInt(e.target.value) || 0)}
              className="h-9 mt-1 tabular-nums"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Validação (dias)</Label>
            <Input
              type="number"
              min="0"
              value={state.validationDays}
              onChange={(e) => setField("validationDays", parseInt(e.target.value) || 0)}
              className="h-9 mt-1 tabular-nums"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Validade da proposta</Label>
            <Input
              type="date"
              value={state.validUntil}
              onChange={(e) => setField("validUntil", e.target.value)}
              className="h-9 mt-1"
            />
          </div>
        </div>
      </Card>

      {/* ─── Considerações ─── */}
      <Card className="p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Considerações
        </h3>
        <ConsiderationsEditor
          items={state.considerations}
          onChange={(v) => setField("considerations", v)}
        />
      </Card>

      {/* ─── Narrativa ─── */}
      <div className="pt-4 border-t border-border/40">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Narrativa da proposta</h2>
            <p className="text-[11px] text-muted-foreground">
              Textos exibidos na página pública e no PDF. Opcional — preencha o que fizer sentido.
            </p>
          </div>
          <GerarComIaDropdown
            proposalId={proposalId}
            hasDealLink={hasDealLink}
            onGenerated={onAiGenerated}
            disabled={isLocked}
          />
        </div>

        <div className="space-y-3">
          <Card className="p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Boas-vindas
            </h3>
            <Textarea
              value={state.welcomeMessage}
              onChange={(e) => setField("welcomeMessage", e.target.value)}
              rows={3}
              placeholder="Olá! Esta é a proposta preparada especialmente para…"
              className="text-base leading-relaxed italic resize-none"
            />
          </Card>

          <Card className="p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resumo executivo
            </h3>
            <Textarea
              value={state.executiveSummary}
              onChange={(e) => setField("executiveSummary", e.target.value)}
              rows={6}
              placeholder="3-4 parágrafos descrevendo a proposta em alto nível."
              className="text-base leading-relaxed resize-none"
            />
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contexto e dor
              </h3>
              {dealPainDescription && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px]"
                  onClick={() => setField("painContext", dealPainDescription)}
                >
                  Importar do deal
                </Button>
              )}
            </div>
            <Textarea
              value={state.painContext}
              onChange={(e) => setField("painContext", e.target.value)}
              rows={5}
              placeholder="O que o cliente está enfrentando hoje."
              className="text-base leading-relaxed resize-none"
            />
          </Card>

          <Card className="p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Visão geral da solução
            </h3>
            <Textarea
              value={state.solutionOverview}
              onChange={(e) => setField("solutionOverview", e.target.value)}
              rows={5}
              placeholder="A solução em alto nível. Os módulos detalhados ficam em cada item do escopo."
              className="text-base leading-relaxed resize-none"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
