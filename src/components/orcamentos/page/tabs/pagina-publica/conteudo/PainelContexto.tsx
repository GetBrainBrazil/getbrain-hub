/**
 * Painel "Esta proposta": Contexto / dor.
 */
import { PainelHeader, Campo } from "./ui";
import { ProposalCommitTextarea } from "./proposalInputs";
import type { PainelPropostaProps } from "./types";

export function PainelContexto({ state, setField, livePatch }: PainelPropostaProps) {
  return (
    <div>
      <PainelHeader
        icon="AlertCircle"
        title="Contexto / dor"
        description="Apresentação da situação atual do cliente — a dor que justifica o projeto."
      />
      <Campo
        label="Texto do contexto"
        hint="Suporta markdown (negrito, itálico, listas). Aparece na seção 01 da proposta."
      >
        <ProposalCommitTextarea
          value={state.painContext || ""}
          onCommit={(v) => setField("painContext", v)}
          onLivePatch={(v) => livePatch({ pain_context: v })}
          placeholder="Hoje a empresa enfrenta…"
          rows={10}
        />
      </Campo>
    </div>
  );
}
