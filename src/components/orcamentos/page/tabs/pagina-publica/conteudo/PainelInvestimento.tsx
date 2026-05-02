/**
 * Painel "Esta proposta": Investimento (valor + parcelamento + layout).
 */
import { PainelHeader, CampoGroup, Campo } from "./ui";
import { Input } from "@/components/ui/input";
import {
  ProposalCommitNumber,
  ProposalCommitToggle,
} from "./proposalInputs";
import { InvestmentLayoutPicker, type InvestmentLayout } from "./InvestmentLayoutPicker";
import { formatBRL } from "@/lib/orcamentos/calculateTotal";
import type { PainelPropostaProps } from "./types";

export function PainelInvestimento({ state, setField, livePatch }: PainelPropostaProps) {
  const total = typeof state.implementationValue === "number" ? state.implementationValue : 0;
  const parcels = typeof state.installmentsCount === "number" ? state.installmentsCount : 0;
  const parcelValue = parcels > 1 && total > 0 ? total / parcels : 0;
  const layout: InvestmentLayout = (state.investmentLayout as InvestmentLayout) || "total_first";
  const showBreakdown = state.showInvestmentBreakdown !== false;

  return (
    <div>
      <PainelHeader
        scope="proposta"
        icon="DollarSign"
        title="Investimento"
        description="Valor cheio + parcelamento + como exibir esse bloco para o cliente."
      />

      <div className="space-y-4">
        <CampoGroup title="Valor">
          <Campo
            label="Valor da implementação"
            hint="O total do projeto. Espelha o valor do CRM."
          >
            <ProposalCommitNumber
              value={state.implementationValue ?? ""}
              onCommit={(v) => setField("implementationValue", v)}
              onLivePatch={(v) => livePatch({ implementation_value: v === "" ? null : v })}
              placeholder="0,00"
              step="0.01"
              min={0}
              prefix="R$"
              className="font-mono"
            />
          </Campo>
        </CampoGroup>

        <CampoGroup title="Parcelamento">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Número de parcelas" hint='Use 1 para "à vista".'>
              <ProposalCommitNumber
                value={state.installmentsCount ?? ""}
                onCommit={(v) => setField("installmentsCount", v)}
                onLivePatch={(v) => livePatch({ installments_count: v === "" ? null : v })}
                placeholder="1"
                step="1"
                min={1}
                suffix="×"
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
                className="h-10 text-sm"
              />
            </Campo>
          </div>

          {parcelValue > 0 && (
            <div className="rounded-md bg-accent/5 px-4 py-3 border border-accent/20 text-xs">
              <span className="text-muted-foreground">Cada parcela: </span>
              <span className="font-mono font-semibold text-accent">{formatBRL(parcelValue)}</span>
              <span className="text-muted-foreground"> · {parcels}× de {formatBRL(parcelValue)}</span>
            </div>
          )}
        </CampoGroup>

        <CampoGroup title="Como exibir nesta proposta" hint="Escolha o destaque visual">
          <InvestmentLayoutPicker
            value={layout}
            onChange={(v) => {
              setField("investmentLayout", v);
              livePatch({ investment_layout: v });
            }}
          />

          <ProposalCommitToggle
            checked={showBreakdown}
            onCommit={(v) => setField("showInvestmentBreakdown", v)}
            onLivePatch={(v) => livePatch({ show_investment_breakdown: v })}
            label="Mostrar composição (lista de itens)"
            description="Exibe ao lado do valor a tabela com cada módulo do escopo."
          />
        </CampoGroup>
      </div>
    </div>
  );
}
