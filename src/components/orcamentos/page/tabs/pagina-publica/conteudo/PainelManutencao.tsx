/**
 * Painel "Esta proposta": Manutenção mensal (MRR).
 */
import { PainelHeader, Campo } from "./ui";
import { ProposalCommitNumber, ProposalCommitTextarea } from "./proposalInputs";
import type { PainelPropostaProps } from "./types";

export function PainelManutencao({ state, setField, livePatch }: PainelPropostaProps) {
  return (
    <div>
      <PainelHeader
        icon="Workflow"
        title="Manutenção mensal"
        description="Mensalidade contínua exibida nos KPIs e na seção Investimento."
      />

      <div className="space-y-5">
        <Campo label="Valor mensal (R$)" hint="Deixe em branco se não houver mensalidade.">
          <ProposalCommitNumber
            value={state.maintenance ?? ""}
            onCommit={(v) => setField("maintenance", v)}
            onLivePatch={(v) => livePatch({ maintenance_monthly_value: v === "" ? null : v })}
            placeholder="0,00"
            step="0.01"
            min={0}
            className="font-mono max-w-[180px]"
          />
        </Campo>

        <Campo
          label="Descrição da manutenção"
          hint="O que está incluso: suporte, ajustes, monitoramento etc."
        >
          <ProposalCommitTextarea
            value={state.maintenanceDesc || ""}
            onCommit={(v) => setField("maintenanceDesc", v)}
            onLivePatch={(v) => livePatch({ maintenance_description: v })}
            placeholder="Inclui suporte técnico, pequenas evoluções…"
            rows={4}
          />
        </Campo>
      </div>
    </div>
  );
}
