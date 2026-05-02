/**
 * SubTab "Conteúdo Global" — editor visual completo do conteúdo
 * institucional editável da página pública. Cada bloco é um Accordion;
 * cada campo persiste on blur via `usePublicPageSettings.update()`.
 *
 * IMPORTANTE: as edições aqui afetam TODAS as propostas da organização.
 */
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Globe, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { usePublicPageSettings } from "@/hooks/orcamentos/usePublicPageSettings";
import { EditorTextoLista } from "./editores/EditorTextoLista";
import { EditorTags } from "./editores/EditorTags";
import { EditorCapabilities } from "./editores/EditorCapabilities";
import { EditorSecoes } from "./editores/EditorSecoes";

const SECTION_KEYS = [
  { key: "carta", label: "Abertura" },
  { key: "contexto", label: "Contexto" },
  { key: "solucao", label: "Solução" },
  { key: "escopo", label: "Escopo" },
  { key: "investimento", label: "Investimento" },
  { key: "cronograma", label: "Cronograma" },
  { key: "sobre", label: "Sobre" },
  { key: "proximos", label: "Próximos passos" },
];

interface Props {
  /** Chamado após cada save bem-sucedido para forçar refresh do iframe na sub-aba Preview. */
  onSettingsChanged?: () => void;
}

export function SubTabConteudo({ onSettingsChanged }: Props) {
  const { settings, isLoading, update, isSaving } = usePublicPageSettings();
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // wrapper que registra o save e notifica o pai
  const persist = async <K extends Parameters<typeof update>[0]>(
    field: K,
    value: any,
  ) => {
    await update(field as any, value);
    setSavedAt(new Date());
    onSettingsChanged?.();
  };

  if (isLoading || !settings) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar / aviso */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-md bg-accent/5 border border-accent/20">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-accent" />
          <span className="text-[11px] text-foreground">
            <strong className="text-accent">Conteúdo global</strong> · alterações afetam todas as propostas
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          {isSaving ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</>
          ) : savedAt ? (
            <><Check className="h-3 w-3 text-emerald-500" /> Salvo às {savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</>
          ) : null}
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["sobre"]} className="space-y-2">
        {/* Hero */}
        <Card>
          <AccordionItem value="hero" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="text-left">
                <div className="text-sm font-medium">Hero & navegação</div>
                <div className="text-[10px] text-muted-foreground font-normal">Etiquetas do topo e indicação de scroll</div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Eyebrows do hero (separadas por ·)</Label>
                <EditorTags
                  value={settings.hero_eyebrows}
                  onCommit={(v) => persist("hero_eyebrows", v)}
                  placeholder="ex.: Estratégia"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Texto de "Role para baixo"</Label>
                <CommitInput
                  value={settings.hero_scroll_cue}
                  onCommit={(v) => persist("hero_scroll_cue", v)}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Card>

        {/* Títulos das seções */}
        <Card>
          <AccordionItem value="secoes" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="text-left">
                <div className="text-sm font-medium">Títulos das seções</div>
                <div className="text-[10px] text-muted-foreground font-normal">Eyebrow e título de cada bloco da página</div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <EditorSecoes
                eyebrows={settings.section_eyebrows}
                titles={settings.section_titles}
                sections={SECTION_KEYS}
                onCommitEyebrows={(v) => persist("section_eyebrows", v)}
                onCommitTitles={(v) => persist("section_titles", v)}
              />
            </AccordionContent>
          </AccordionItem>
        </Card>

        {/* Sobre */}
        <Card>
          <AccordionItem value="sobre" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="text-left">
                <div className="text-sm font-medium">Sobre a GetBrain</div>
                <div className="text-[10px] text-muted-foreground font-normal">Parágrafos descritivos da empresa</div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <EditorTextoLista
                value={settings.about_paragraphs}
                onCommit={(v) => persist("about_paragraphs", v)}
                placeholder="Escreva um parágrafo…"
                addLabel="Adicionar parágrafo"
              />
            </AccordionContent>
          </AccordionItem>
        </Card>

        {/* Capabilities */}
        <Card>
          <AccordionItem value="capabilities" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="text-left">
                <div className="text-sm font-medium">Cards de capacidades</div>
                <div className="text-[10px] text-muted-foreground font-normal">Os cards exibidos na seção "Sobre"</div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <EditorCapabilities
                value={settings.capabilities}
                onCommit={(v) => persist("capabilities", v)}
              />
            </AccordionContent>
          </AccordionItem>
        </Card>

        {/* Tech stack */}
        <Card>
          <AccordionItem value="tech" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="text-left">
                <div className="text-sm font-medium">Stack tecnológico</div>
                <div className="text-[10px] text-muted-foreground font-normal">Tecnologias exibidas em scroll horizontal</div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <EditorTags
                value={settings.tech_stack}
                onCommit={(v) => persist("tech_stack", v)}
                placeholder="React, TypeScript…"
              />
            </AccordionContent>
          </AccordionItem>
        </Card>

        {/* Próximos passos */}
        <Card>
          <AccordionItem value="proximos" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="text-left">
                <div className="text-sm font-medium">CTA "Próximos passos"</div>
                <div className="text-[10px] text-muted-foreground font-normal">Bloco final antes do botão "Quero avançar"</div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Título</Label>
                <CommitInput
                  value={settings.next_steps_title}
                  onCommit={(v) => persist("next_steps_title", v)}
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Parágrafos</Label>
                <EditorTextoLista
                  value={settings.next_steps_paragraphs}
                  onCommit={(v) => persist("next_steps_paragraphs", v)}
                  placeholder="Texto explicativo…"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Card>

        {/* Tela de senha */}
        <Card>
          <AccordionItem value="senha" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="text-left">
                <div className="text-sm font-medium">Tela de senha</div>
                <div className="text-[10px] text-muted-foreground font-normal">Texto exibido antes de o cliente acessar</div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Título</Label>
                <CommitInput value={settings.password_gate_title} onCommit={(v) => persist("password_gate_title", v)} />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Subtítulo</Label>
                <CommitTextarea value={settings.password_gate_subtitle} onCommit={(v) => persist("password_gate_subtitle", v)} />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Botão</Label>
                <CommitInput value={settings.password_gate_button} onCommit={(v) => persist("password_gate_button", v)} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Card>

        {/* Footer & contato */}
        <Card>
          <AccordionItem value="footer" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="text-left">
                <div className="text-sm font-medium">Rodapé & contato</div>
                <div className="text-[10px] text-muted-foreground font-normal">Tagline e canais exibidos no rodapé</div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Tagline</Label>
                  <CommitInput value={settings.footer_tagline} onCommit={(v) => persist("footer_tagline", v)} />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Label "falar com a gente"</Label>
                  <CommitInput value={settings.footer_contact_label} onCommit={(v) => persist("footer_contact_label", v)} />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Nome de exibição</Label>
                  <CommitInput
                    value={settings.contact_display_name ?? ""}
                    onCommit={(v) => persist("contact_display_name", v || null)}
                    placeholder="Daniel — GetBrain"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">WhatsApp (E.164)</Label>
                  <CommitInput
                    value={settings.contact_whatsapp ?? ""}
                    onCommit={(v) => persist("contact_whatsapp", v || null)}
                    placeholder="5521973818244"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">Email de contato</Label>
                  <CommitInput
                    value={settings.contact_email ?? ""}
                    onCommit={(v) => persist("contact_email", v || null)}
                    placeholder="contato@getbrain.com.br"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Card>
      </Accordion>
    </div>
  );
}

/* ---------- Helpers internos: input/textarea com commit on blur ---------- */
function CommitInput({ value, onCommit, placeholder }: { value: string; onCommit: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <Input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== value) onCommit(v); }}
      placeholder={placeholder}
      className="h-8 text-sm"
    />
  );
}

function CommitTextarea({ value, onCommit, placeholder }: { value: string; onCommit: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <Textarea
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== value) onCommit(v); }}
      placeholder={placeholder}
      rows={2}
      className="text-sm resize-y"
    />
  );
}
