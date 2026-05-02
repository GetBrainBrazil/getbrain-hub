/**
 * Painel: Rodapé & contato — tagline e canais de contato exibidos no rodapé
 * da página pública e usados pelo chat/agente de IA quando precisa escalar.
 */
import { PainelHeader, Campo, CommitInput } from "./ui";
import type { PainelProps } from "./types";

export function PainelRodape({ settings, persist }: PainelProps) {
  return (
    <div>
      <PainelHeader
        icon="MessageCircle"
        title="Rodapé & contato"
        description="Informações exibidas no rodapé e usadas pelo chat para escalar para um humano."
      />

      <div className="space-y-6">
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Rodapé visível
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Tagline" hint="Frase curta exibida no rodapé.">
              <CommitInput
                value={settings.footer_tagline}
                onCommit={(v) => persist("footer_tagline", v)}
              />
            </Campo>
            <Campo label='Label "falar com a gente"' hint="Texto do link de contato no rodapé.">
              <CommitInput
                value={settings.footer_contact_label}
                onCommit={(v) => persist("footer_contact_label", v)}
              />
            </Campo>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Canais de contato
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Nome de exibição" hint='Aparece como assinatura (ex.: "Daniel — GetBrain").'>
              <CommitInput
                value={settings.contact_display_name ?? ""}
                onCommit={(v) => persist("contact_display_name", (v || null) as any)}
                placeholder="Daniel — GetBrain"
              />
            </Campo>
            <Campo label="WhatsApp" hint="Formato E.164, sem espaços nem símbolos. Ex.: 5521973818244.">
              <CommitInput
                value={settings.contact_whatsapp ?? ""}
                onCommit={(v) => persist("contact_whatsapp", (v || null) as any)}
                placeholder="5521973818244"
              />
            </Campo>
            <div className="sm:col-span-2">
              <Campo label="E-mail de contato" hint="Exibido no rodapé e usado pelo chat para escalar quando preciso.">
                <CommitInput
                  value={settings.contact_email ?? ""}
                  onCommit={(v) => persist("contact_email", (v || null) as any)}
                  placeholder="contato@getbrain.com.br"
                />
              </Campo>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
