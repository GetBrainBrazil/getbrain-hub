/**
 * Painel "Esta proposta": Identidade — título, boas-vindas, cor da marca,
 * mockup interativo. Agrupa as variáveis "atmosféricas" da proposta.
 */
import { PainelHeader, CampoGroup, Campo } from "./ui";
import {
  ProposalCommitInput,
  ProposalCommitTextarea,
  ProposalCommitColor,
} from "./proposalInputs";
import { ExternalLink } from "lucide-react";
import type { PainelPropostaProps } from "./types";

export function PainelIdentidade({ state, setField, livePatch }: PainelPropostaProps) {
  return (
    <div>
      <PainelHeader
        scope="proposta"
        icon="Sparkles"
        title="Identidade da proposta"
        description="O título, a boas-vindas, a cor de destaque e o mockup interativo."
      />

      <div className="space-y-4">
        <CampoGroup title="Cabeçalho">
          <Campo label="Título da proposta" hint="Aparece grande no topo (hero). Vazio usa o nome da empresa.">
            <ProposalCommitInput
              value={state.title || ""}
              onCommit={(v) => setField("title", v)}
              onLivePatch={(v) => livePatch({ title: v })}
              placeholder="Ex.: Plataforma de IA para ABC Ltda"
              maxLength={120}
            />
          </Campo>

          <Campo
            label="Mensagem de boas-vindas"
            hint="Texto logo abaixo do título do hero. Vazio usa um padrão personalizado."
          >
            <ProposalCommitTextarea
              value={state.welcomeMessage || ""}
              onCommit={(v) => setField("welcomeMessage", v)}
              onLivePatch={(v) => livePatch({ welcome_message: v })}
              placeholder="Esta proposta foi escrita exclusivamente para…"
              rows={4}
              maxLength={400}
            />
          </Campo>
        </CampoGroup>

        <CampoGroup title="Marca do cliente" hint="Cor usada em destaques">
          <Campo label="Cor de destaque" hint="Hex 6 dígitos. Aplica em CTAs, ícones e linhas decorativas. Vazio usa o cyan padrão.">
            <ProposalCommitColor
              value={state.clientBrandColor || ""}
              onCommit={(v) => setField("clientBrandColor", v)}
              onLivePatch={(v) => livePatch({ client_brand_color: v || null })}
            />
          </Campo>

          {state.clientLogoUrl && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/40">
              <img
                src={state.clientLogoUrl}
                alt="Logo"
                className="h-12 w-12 object-contain rounded bg-white/5 border border-border/40"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">Logo do cliente</div>
                <div className="text-[11px] text-muted-foreground">Para trocar, use a aba <strong>Cliente</strong>.</div>
              </div>
            </div>
          )}
        </CampoGroup>

        <CampoGroup title="Mockup interativo" hint="Opcional">
          <Campo label="URL do protótipo" hint="Link clicável exibido na seção 06 (Protótipo). Use Figma, Lovable, etc.">
            <ProposalCommitInput
              value={state.mockupUrl || ""}
              onCommit={(v) => setField("mockupUrl", v)}
              onLivePatch={(v) => livePatch({ mockup_url: v || null })}
              placeholder="https://…"
            />
          </Campo>
          {state.mockupUrl && (
            <a
              href={state.mockupUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir mockup em nova aba
            </a>
          )}
        </CampoGroup>
      </div>
    </div>
  );
}
