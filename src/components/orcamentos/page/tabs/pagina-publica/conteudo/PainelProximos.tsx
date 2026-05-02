/**
 * Painel: CTA "Próximos passos" — bloco final antes do botão "Quero avançar".
 */
import { PainelHeader, Campo, CommitInput } from "./ui";
import { EditorTextoLista } from "../editores/EditorTextoLista";
import type { PainelProps } from "./types";

export function PainelProximos({ settings, persist }: PainelProps) {
  return (
    <div>
      <PainelHeader
        icon="ArrowRight"
        title='CTA "Próximos passos"'
        description='Bloco final que aparece logo antes do botão "Quero avançar".'
      />
      <div className="space-y-5">
        <Campo label="Título" hint="Frase de chamada principal antes do botão.">
          <CommitInput
            value={settings.next_steps_title}
            onCommit={(v) => persist("next_steps_title", v)}
            placeholder="Vamos começar?"
          />
        </Campo>
        <Campo
          label="Parágrafos"
          count={settings.next_steps_paragraphs.length}
          hint="Texto explicativo que prepara o cliente para clicar em avançar."
        >
          <EditorTextoLista
            value={settings.next_steps_paragraphs}
            onCommit={(v) => persist("next_steps_paragraphs", v)}
            placeholder="Texto explicativo…"
            addLabel="Adicionar parágrafo"
            rows={2}
          />
        </Campo>
      </div>
    </div>
  );
}
