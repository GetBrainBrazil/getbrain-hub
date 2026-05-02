/**
 * Painel "Esta proposta": Investimento (valor cheio + parcelamento).
 */
import { PainelHeader, Campo } from "./ui";
import { Input } from "@/components/ui/input";
import { ProposalCommitNumber } from "./proposalInputs";
import { formatBRL } from "@/lib/orcamentos/calculateTotal";
import type { PainelPropostaProps } from "./types";

export function PainelInvestimento({ state, setField, livePatch }: PainelPropostaProps) {
  const total = typeof state.implementationValue === "number" ? state.implementationValue : 0;
  const parcels = typeof state.installmentsCount === "number" ? state.installmentsCount : 0;
  const parcelValue = parcels > 1 && total > 0 ? total / parcels : 0;

  return (
    <div>
      <PainelHeader
        icon="DollarSign"
        title="Investimento"
        description="Valor cheio do projeto + parcelamento exibidos no hero e na seção Investimento."
      />

      <div className="space-y-5">
        <Campo
          label="Valor da implementação (R$)"
          hint="O total do projeto. Espelha o valor do CRM."
        >
          <ProposalCommitNumber
            value={state.implementationValue ?? ""}
            onCommit={(v) => setField("implementationValue", v)}
            onLivePatch={(v) => livePatch({ implementation_value: v === "" ? null : v })}
            placeholder="0,00"
            step="0.01"
            min={0}
            className="font-mono"
          />
        </Campo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Número de parcelas" hint='Use 1 para "à vista".'>
            <ProposalCommitNumber
              value={state.installmentsCount ?? ""}
              onCommit={(v) => setField("installmentsCount", v)}
              onLivePatch={(v) => livePatch({ installments_count: v === "" ? null : v })}
              placeholder="1"
              step="1"
              min={1}
            />
          </Campo>

          <Campo label="Data da 1ª parcela">
            <Input
              type="date"
              value={state.firstInstallmentDate || ""}
              onChange={(e) => {
                setField("firstInstallmentDate", e.target.value);
                livePatch({ first_installment_date: e.target.value || null });
              }}
              className="h-9 text-sm"
            />
          </Campo>
        </div>

        {parcelValue > 0 && (
          <div className="rounded-md bg-muted/40 px-4 py-3 border border-border text-xs">
            <span className="text-muted-foreground">Cada parcela: </span>
            <span className="font-mono font-semibold">{formatBRL(parcelValue)}</span>
            <span className="text-muted-foreground"> · {parcels}× de {formatBRL(parcelValue)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
