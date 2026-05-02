/**
 * SubTab "Conteúdo Global" — editor visual remodelado em layout sidebar + painel.
 *
 * - Sidebar à esquerda lista 8 painéis agrupados em 3 categorias, com busca.
 * - Painel à direita renderiza o painel ativo. Cada painel autosalva on blur.
 * - Header mostra status global de save e botão para abrir a sub-aba Preview.
 * - Estado da seção ativa persiste via usePersistedState.
 *
 * IMPORTANTE: as edições aqui afetam TODAS as propostas da organização.
 */
import { useMemo, useState } from "react";
import { Loader2, Globe, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { usePublicPageSettings } from "@/hooks/orcamentos/usePublicPageSettings";
import { SidebarConteudo } from "./conteudo/SidebarConteudo";
import { PainelHero } from "./conteudo/PainelHero";
import { PainelSecoes } from "./conteudo/PainelSecoes";
import { PainelSobre } from "./conteudo/PainelSobre";
import { PainelCapacidades } from "./conteudo/PainelCapacidades";
import { PainelStack } from "./conteudo/PainelStack";
import { PainelProximos } from "./conteudo/PainelProximos";
import { PainelSenha } from "./conteudo/PainelSenha";
import { PainelRodape } from "./conteudo/PainelRodape";
import type { SecaoMeta } from "./conteudo/types";

const GROUPS: { label: string; items: SecaoMeta[] }[] = [
  {
    label: "Estrutura da página",
    items: [
      { id: "hero", group: "estrutura", label: "Hero & navegação", description: "Etiquetas e indicação de scroll", icon: "Sparkles", keywords: ["hero", "topo", "scroll", "eyebrow", "etiqueta"] },
      { id: "secoes", group: "estrutura", label: "Títulos das seções", description: "Eyebrow e título de cada bloco", icon: "Type", keywords: ["seção", "título", "eyebrow", "abertura", "contexto", "solução", "escopo", "investimento", "cronograma", "sobre", "próximos"] },
      { id: "proximos", group: "estrutura", label: "CTA Próximos passos", description: 'Bloco final antes de "Quero avançar"', icon: "ArrowRight", keywords: ["cta", "próximos", "avançar", "fechamento"] },
    ],
  },
  {
    label: "Institucional",
    items: [
      { id: "sobre", group: "institucional", label: "Sobre a GetBrain", description: "Parágrafos descritivos", icon: "Building2", keywords: ["sobre", "empresa", "parágrafo", "descrição"] },
      { id: "capacidades", group: "institucional", label: "Cards de capacidades", description: 'Cards exibidos na seção "Sobre"', icon: "LayoutGrid", keywords: ["capacidade", "card", "ícone"] },
      { id: "stack", group: "institucional", label: "Stack tecnológico", description: "Tags de tecnologias usadas", icon: "Cpu", keywords: ["stack", "tecnologia", "tag", "react", "typescript"] },
    ],
  },
  {
    label: "Acesso & contato",
    items: [
      { id: "senha", group: "acesso", label: "Tela de senha", description: "Texto exibido antes do acesso", icon: "Lock", keywords: ["senha", "gate", "privado", "acesso"] },
      { id: "rodape", group: "acesso", label: "Rodapé & contato", description: "Tagline, WhatsApp, e-mail", icon: "MessageCircle", keywords: ["rodapé", "footer", "whatsapp", "email", "contato", "tagline"] },
    ],
  },
];

interface Props {
  /** Chamado após cada save para forçar reload do iframe na sub-aba Preview. */
  onSettingsChanged?: () => void;
  /** Permite o header trocar para a sub-aba Pré-visualização. */
  onOpenPreview?: () => void;
}

export function SubTabConteudo({ onSettingsChanged, onOpenPreview }: Props) {
  const { settings, isLoading, update, isSaving } = usePublicPageSettings();
  const [active, setActive] = usePersistedState<string>(
    "proposal-pagina-publica-conteudo-secao",
    "hero",
  );
  const [query, setQuery] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  const persist = async <K extends Parameters<typeof update>[0]>(field: K, value: any) => {
    await update(field as any, value);
    setSavedAt(new Date());
    setDirty((d) => ({ ...d, [active]: false }));
    onSettingsChanged?.();
  };

  const setDirtyForActive = (v: boolean) =>
    setDirty((d) => (d[active] === v ? d : { ...d, [active]: v }));

  const ActivePanel = useMemo(() => {
    if (!settings) return null;
    const props = { settings, persist, setDirty: setDirtyForActive } as any;
    switch (active) {
      case "hero": return <PainelHero {...props} />;
      case "secoes": return <PainelSecoes {...props} />;
      case "sobre": return <PainelSobre {...props} />;
      case "capacidades": return <PainelCapacidades {...props} />;
      case "stack": return <PainelStack {...props} />;
      case "proximos": return <PainelProximos {...props} />;
      case "senha": return <PainelSenha {...props} />;
      case "rodape": return <PainelRodape {...props} />;
      default: return <PainelHero {...props} />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, settings]);

  if (isLoading || !settings) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/20">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs text-foreground">
            <strong className="text-accent">Conteúdo global</strong>
            <span className="text-muted-foreground"> · alterações afetam todas as propostas</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 min-w-[110px] justify-end">
            {isSaving ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</>
            ) : savedAt ? (
              <><Check className="h-3 w-3 text-emerald-500" /> Salvo às {savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</>
            ) : (
              <span className="opacity-0">·</span>
            )}
          </div>
          {onOpenPreview && (
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={onOpenPreview}>
              <Eye className="h-3.5 w-3.5" />
              Pré-visualizar
            </Button>
          )}
        </div>
      </div>

      {/* Layout sidebar + painel */}
      <div className="flex flex-col md:flex-row gap-4">
        <SidebarConteudo
          groups={GROUPS}
          active={active}
          onChange={setActive}
          query={query}
          onQueryChange={setQuery}
          dirty={dirty}
        />
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            {ActivePanel}
          </div>
        </div>
      </div>
    </div>
  );
}
