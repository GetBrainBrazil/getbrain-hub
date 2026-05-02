/**
 * Tab "Escopo" — itens (NotionItemsEditor) + manutenção mensal + prazos +
 * considerações + narrativa (boas-vindas, resumo executivo, contexto/dor,
 * visão da solução). A narrativa antes vivia em "Conteúdo IA".
 *
 * Cada bloco em Card separado para dar respiro visual e ajudar a navegação
 * vertical longa.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotionItemsEditor } from "@/components/orcamentos/NotionItemsEditor";
import { ConsiderationsEditor } from "@/components/orcamentos/ConsiderationsEditor";
import { GerarComIaDropdown } from "@/components/orcamentos/GerarComIaDropdown";
import {
  calculateScopeTotal,
  formatBRL,
  type ScopeItem,
} from "@/lib/orcamentos/calculateTotal";
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
  };
  setField: (field: any, value: any) => void;
  setItems: (items: ScopeItem[]) => void;
  onOpenItemDetails: (idx: number) => void;
  dealPainDescription?: string | null;
  onAiGenerated: (type: GenerationType, content: any) => void;
}

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
  const total = calculateScopeTotal(state.scopeItems);
  const monthly =
    typeof state.maintenance === "number" && state.maintenance > 0 ? state.maintenance : 0;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Resumo de totais */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Total dos itens
          </p>
          <p className="text-xl font-bold tabular-nums text-success mt-0.5">
            {formatBRL(total)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Manutenção / mês
          </p>
          <p
            className={`text-xl font-bold tabular-nums mt-0.5 ${
              monthly > 0 ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {monthly > 0 ? formatBRL(monthly) : "—"}
          </p>
        </Card>
      </div>

      {/* Módulos / itens */}
      <Card className="p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Módulos da proposta
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {state.scopeItems.length} item(s)
          </span>
        </div>
        <NotionItemsEditor
          items={state.scopeItems}
          onChange={setItems}
          onOpenDetails={onOpenItemDetails}
        />
      </Card>

      {/* Manutenção */}
      <Card className="p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Manutenção mensal{" "}
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
        {monthly > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Receita anual recorrente:{" "}
            <strong className="text-foreground tabular-nums">
              {formatBRL(monthly * 12)}
            </strong>
          </p>
        )}
      </Card>

      {/* Prazos */}
      <Card className="p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Prazos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">
              Implementação (dias)
            </Label>
            <Input
              type="number"
              min="0"
              value={state.implementationDays}
              onChange={(e) =>
                setField("implementationDays", parseInt(e.target.value) || 0)
              }
              className="h-9 mt-1 tabular-nums"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Validação (dias)</Label>
            <Input
              type="number"
              min="0"
              value={state.validationDays}
              onChange={(e) =>
                setField("validationDays", parseInt(e.target.value) || 0)
              }
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

      {/* Considerações */}
      <Card className="p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Considerações
        </h3>
        <ConsiderationsEditor
          items={state.considerations}
          onChange={(v) => setField("considerations", v)}
        />
      </Card>

      {/* ─────────── Narrativa (antes em "Conteúdo IA") ─────────── */}
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
