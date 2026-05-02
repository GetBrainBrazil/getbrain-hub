/**
 * Painel: Hero & navegação. Edita as eyebrows do topo e o texto "role para baixo".
 */
import { PainelHeader, Campo, CommitInput } from "./ui";
import { EditorTags } from "../editores/EditorTags";
import type { PainelProps } from "./types";

export function PainelHero({ settings, persist }: PainelProps) {
  return (
    <div>
      <PainelHeader
        icon="Sparkles"
        title="Hero & navegação"
        description="O primeiro bloco que o cliente vê ao abrir a proposta."
      />
      <div className="space-y-5">
        <Campo
          label="Etiquetas exibidas no hero"
          count={settings.hero_eyebrows.length}
          hint="Pequenos rótulos exibidos antes do título principal, separados por · na página pública."
        >
          <EditorTags
            value={settings.hero_eyebrows}
            onCommit={(v) => persist("hero_eyebrows", v)}
            placeholder="ex.: Estratégia"
          />
        </Campo>

        <Campo
          label='Texto de "role para baixo"'
          hint="Aparece logo abaixo do título do hero, indicando que há mais conteúdo."
        >
          <CommitInput
            value={settings.hero_scroll_cue}
            onCommit={(v) => persist("hero_scroll_cue", v)}
            placeholder="Role para baixo"
          />
        </Campo>
      </div>
    </div>
  );
}
