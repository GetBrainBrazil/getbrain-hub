/**
 * Painel "Esta proposta": mensagem de boas-vindas (subhead do hero).
 */
import { PainelHeader, Campo } from "./ui";
import { ProposalCommitTextarea } from "./proposalInputs";
import type { PainelPropostaProps } from "./types";

export function PainelMensagemBoasVindas({ state, setField, livePatch }: PainelPropostaProps) {
  return (
    <div>
      <PainelHeader
        icon="MessageCircle"
        title="Mensagem de boas-vindas"
        description="Texto exibido logo abaixo do título principal do hero."
      />
      <Campo
        label="Mensagem"
        hint="Se vazio, usamos um texto padrão personalizado com o nome do cliente."
      >
        <ProposalCommitTextarea
          value={state.welcomeMessage || ""}
          onCommit={(v) => setField("welcomeMessage", v)}
          onLivePatch={(v) => livePatch({ welcome_message: v })}
          placeholder="Esta proposta foi escrita exclusivamente para…"
          rows={4}
        />
      </Campo>
    </div>
  );
}
