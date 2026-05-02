/**
 * Painel "Esta proposta": Considerações (lista de bullets exibida no Escopo).
 */
import { PainelHeader, Campo } from "./ui";
import { EditorTextoLista } from "../editores/EditorTextoLista";
import type { PainelPropostaProps } from "./types";

export function PainelConsideracoes({ state, setField, livePatch }: PainelPropostaProps) {
  return (
    <div>
      <PainelHeader
        icon="ListChecks"
        title="Considerações"
        description="Pequenos avisos / premissas exibidos junto da seção Escopo."
      />
      <Campo
        label="Itens"
        count={(state.considerations || []).length}
        hint="Cada item vira um bullet. Mantenha curtos e diretos."
      >
        <EditorTextoLista
          value={state.considerations || []}
          onCommit={(v) => {
            setField("considerations", v);
            livePatch({ considerations: v });
          }}
          placeholder="Ex.: Hospedagem por conta do cliente."
          addLabel="Adicionar consideração"
          rows={2}
        />
      </Campo>
    </div>
  );
}
