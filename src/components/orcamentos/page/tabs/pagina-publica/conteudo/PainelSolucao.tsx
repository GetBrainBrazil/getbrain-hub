/**
 * Painel "Esta proposta": Solução.
 */
import { PainelHeader, Campo } from "./ui";
import { ProposalCommitTextarea } from "./proposalInputs";
import type { PainelPropostaProps } from "./types";

export function PainelSolucao({ state, setField, livePatch }: PainelPropostaProps) {
  return (
    <div>
      <PainelHeader
        icon="Lightbulb"
        title="Solução proposta"
        description="A visão geral da solução — o quê e porquê."
      />
      <Campo
        label="Texto da solução"
        hint="Suporta markdown. Aparece na seção 02 da proposta, complementando o escopo."
      >
        <ProposalCommitTextarea
          value={state.solutionOverview || ""}
          onCommit={(v) => setField("solutionOverview", v)}
          onLivePatch={(v) => livePatch({ solution_overview: v })}
          placeholder="Vamos construir uma plataforma que…"
          rows={10}
        />
      </Campo>
    </div>
  );
}
