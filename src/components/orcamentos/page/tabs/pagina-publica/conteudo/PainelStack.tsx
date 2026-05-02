/**
 * Painel: Stack tecnológico — tags exibidas em scroll horizontal.
 */
import { PainelHeader, Campo } from "./ui";
import { EditorTags } from "../editores/EditorTags";
import type { PainelProps } from "./types";

export function PainelStack({ settings, persist }: PainelProps) {
  return (
    <div>
      <PainelHeader
        icon="Cpu"
        title="Stack tecnológico"
        description="Lista de tecnologias que aparece num scroll horizontal contínuo na seção Sobre."
      />
      <Campo
        label="Tecnologias"
        count={settings.tech_stack.length}
        hint="Adicione nomes curtos. Pressione Enter ou vírgula para confirmar cada item."
      >
        <EditorTags
          value={settings.tech_stack}
          onCommit={(v) => persist("tech_stack", v)}
          placeholder="React, TypeScript…"
        />
      </Campo>
    </div>
  );
}
