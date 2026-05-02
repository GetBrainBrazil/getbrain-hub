/**
 * Tab "Escopo" — itens (NotionItemsEditor) + manutenção mensal + prazos +
 * considerações.
 *
 * Cada bloco em Card separado para dar respiro visual e ajudar a navegação
 * vertical longa.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotionItemsEditor } from "@/components/orcamentos/NotionItemsEditor";
import { ConsiderationsEditor } from "@/components/orcamentos/ConsiderationsEditor";
import {
  calculateScopeTotal,
  formatBRL,
  type ScopeItem,
} from "@/lib/orcamentos/calculateTotal";

interface Props {
  state: {
    scopeItems: ScopeItem[];
    maintenance: number | "";
    maintenanceDesc: string;
    implementationDays: number;
    validationDays: number;
    considerations: string[];
    validUntil: string;
  };
  setField: (field: any, value: any) => void;
  setItems: (items: ScopeItem[]) => void;
  onOpenItemDetails: (idx: number) => void;
}

export function TabEscopo({ state, setField, setItems, onOpenItemDetails }: Props) {
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
    </div>
  );
}
