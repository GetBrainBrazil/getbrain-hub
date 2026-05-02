/**
 * Painel "Esta proposta": Cronograma (prazos + validade).
 */
import { PainelHeader, Campo } from "./ui";
import { Input } from "@/components/ui/input";
import { ProposalCommitNumber } from "./proposalInputs";
import type { PainelPropostaProps } from "./types";

export function PainelCronograma({ state, setField, livePatch }: PainelPropostaProps) {
  return (
    <div>
      <PainelHeader
        icon="Calendar"
        title="Cronograma & validade"
        description="Prazos exibidos nos KPIs do hero e na seção Cronograma."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Dias de implementação" hint="Tempo de desenvolvimento + entrega.">
          <ProposalCommitNumber
            value={state.implementationDays ?? ""}
            onCommit={(v) => setField("implementationDays", v === "" ? 0 : v)}
            onLivePatch={(v) => livePatch({ implementation_days: v === "" ? null : v })}
            placeholder="30"
            step="1"
            min={0}
          />
        </Campo>

        <Campo label="Dias de validação" hint="Período de testes/ajustes pós-entrega.">
          <ProposalCommitNumber
            value={state.validationDays ?? ""}
            onCommit={(v) => setField("validationDays", v === "" ? 0 : v)}
            onLivePatch={(v) => livePatch({ validation_days: v === "" ? null : v })}
            placeholder="7"
            step="1"
            min={0}
          />
        </Campo>

        <div className="sm:col-span-2">
          <Campo label="Válida até" hint="Data limite para o cliente aceitar a proposta.">
            <Input
              type="date"
              value={state.validUntil || ""}
              onChange={(e) => {
                setField("validUntil", e.target.value);
                livePatch({ expires_at: e.target.value || null });
              }}
              className="h-9 text-sm max-w-xs"
            />
          </Campo>
        </div>
      </div>
    </div>
  );
}
