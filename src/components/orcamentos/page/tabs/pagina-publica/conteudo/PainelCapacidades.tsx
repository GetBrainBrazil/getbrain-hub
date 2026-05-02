/**
 * Painel: Cards de capacidades exibidos na seção "Sobre".
 */
import { PainelHeader, Campo } from "./ui";
import { EditorCapabilities } from "../editores/EditorCapabilities";
import type { PainelProps } from "./types";

export function PainelCapacidades({ settings, persist }: PainelProps) {
  return (
    <div>
      <PainelHeader
        icon="LayoutGrid"
        title="Cards de capacidades"
        description="Pequenos cards com ícone + título + descrição que destacam o que a GetBrain entrega."
      />
      <Campo
        label="Cards"
        count={settings.capabilities.length}
        hint="Recomendado entre 3 e 6 cards. O ícone pode ser trocado clicando nele."
      >
        <EditorCapabilities
          value={settings.capabilities}
          onCommit={(v) => persist("capabilities", v)}
        />
      </Campo>
    </div>
  );
}
