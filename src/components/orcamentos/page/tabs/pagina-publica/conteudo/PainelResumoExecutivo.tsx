/**
 * Painel "Esta proposta": Resumo executivo (carta de abertura base).
 *
 * Importante: a "Carta de Daniel" exibida na proposta é gerada por IA quando
 * possível. Este resumo é o **fallback** mostrado se a IA não rodou — também
 * usado como contexto pela IA. Editar aqui não bloqueia a IA.
 */
import { PainelHeader, Campo } from "./ui";
import { ProposalCommitTextarea } from "./proposalInputs";
import type { PainelPropostaProps } from "./types";

export function PainelResumoExecutivo({ state, setField, livePatch }: PainelPropostaProps) {
  return (
    <div>
      <PainelHeader
        icon="FileText"
        title="Resumo executivo (carta base)"
        description="Texto base usado pela IA para escrever a carta de abertura — e exibido como fallback."
      />
      <Campo
        label="Resumo executivo"
        hint="Markdown. Quanto mais específico, melhor a carta gerada pela IA."
      >
        <ProposalCommitTextarea
          value={state.executiveSummary || ""}
          onCommit={(v) => setField("executiveSummary", v)}
          onLivePatch={(v) => livePatch({ executive_summary: v })}
          placeholder="Em uma reunião com…"
          rows={10}
        />
      </Campo>
    </div>
  );
}
