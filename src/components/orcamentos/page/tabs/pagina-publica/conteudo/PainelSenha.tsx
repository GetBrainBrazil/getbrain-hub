/**
 * Painel: Tela de senha (gate) exibida antes do cliente acessar a proposta.
 */
import { PainelHeader, Campo, CommitInput, CommitTextarea } from "./ui";
import type { PainelProps } from "./types";

export function PainelSenha({ settings, persist }: PainelProps) {
  return (
    <div>
      <PainelHeader
        icon="Lock"
        title="Tela de senha"
        description="Conteúdo exibido quando a proposta exige senha — antes do cliente acessar o conteúdo."
      />
      <div className="space-y-5">
        <Campo label="Título" hint='Título grande exibido no centro do gate (ex.: "Esta proposta é privada").'>
          <CommitInput
            value={settings.password_gate_title}
            onCommit={(v) => persist("password_gate_title", v)}
          />
        </Campo>
        <Campo label="Subtítulo" hint="Texto secundário explicando o porquê da senha.">
          <CommitTextarea
            value={settings.password_gate_subtitle}
            onCommit={(v) => persist("password_gate_subtitle", v)}
            rows={2}
          />
        </Campo>
        <Campo label="Texto do botão" hint="Botão que valida a senha digitada.">
          <CommitInput
            value={settings.password_gate_button}
            onCommit={(v) => persist("password_gate_button", v)}
          />
        </Campo>
      </div>
    </div>
  );
}
