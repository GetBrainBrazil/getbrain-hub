/**
 * Painel: Sobre a GetBrain — parágrafos institucionais.
 */
import { PainelHeader, Campo } from "./ui";
import { EditorTextoLista } from "../editores/EditorTextoLista";
import type { PainelProps } from "./types";

export function PainelSobre({ settings, persist }: PainelProps) {
  return (
    <div>
      <PainelHeader
        icon="Building2"
        title="Sobre a GetBrain"
        description='Os parágrafos exibidos na seção "Sobre a GetBrain" da proposta.'
      />
      <Campo
        label="Parágrafos descritivos"
        count={settings.about_paragraphs.length}
        hint="Cada parágrafo vira um bloco de texto separado. Mantenha 2 a 4 parágrafos curtos para boa leitura."
      >
        <EditorTextoLista
          value={settings.about_paragraphs}
          onCommit={(v) => persist("about_paragraphs", v)}
          placeholder="Escreva um parágrafo…"
          addLabel="Adicionar parágrafo"
        />
      </Campo>
    </div>
  );
}
