/**
 * SubTab "Conteúdo" — CMS completo da página pública.
 *
 * Layout 3 colunas: sidebar de navegação | painel ativo | preview ao vivo.
 * - Grupo "Esta proposta": textos e números desta proposta (welcome, contexto,
 *   solução, escopo, investimento, cronograma, manutenção, considerações, resumo).
 * - Grupo "Global": conteúdo institucional editado em public_page_settings.
 *
 * Sincronia: quando o usuário muda de painel, o iframe de preview rola para a
 * seção correspondente. Edits em campos por-proposta enviam patch in-memory ao
 * iframe (debounce ~300ms) e persistem no banco via setField on blur.
 */
import { useMemo, useRef, useState } from "react";
import { Loader2, Globe, Check, Eye, Columns2, Maximize2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePublicPageSettings } from "@/hooks/orcamentos/usePublicPageSettings";
import { SidebarConteudo } from "./conteudo/SidebarConteudo";
import { PreviewPane, type PreviewPaneHandle } from "./conteudo/PreviewPane";
// painéis globais
import { PainelHero } from "./conteudo/PainelHero";
import { PainelSecoes } from "./conteudo/PainelSecoes";
import { PainelSobre } from "./conteudo/PainelSobre";
import { PainelCapacidades } from "./conteudo/PainelCapacidades";
import { PainelStack } from "./conteudo/PainelStack";
import { PainelProximos } from "./conteudo/PainelProximos";
import { PainelSenha } from "./conteudo/PainelSenha";
import { PainelRodape } from "./conteudo/PainelRodape";
// painéis por-proposta
import { PainelMensagemBoasVindas } from "./conteudo/PainelMensagemBoasVindas";
import { PainelContexto } from "./conteudo/PainelContexto";
import { PainelSolucao } from "./conteudo/PainelSolucao";
import { PainelResumoExecutivo } from "./conteudo/PainelResumoExecutivo";
import { PainelEscopoItens } from "./conteudo/PainelEscopoItens";
import { PainelInvestimento } from "./conteudo/PainelInvestimento";
import { PainelCronograma } from "./conteudo/PainelCronograma";
import { PainelManutencao } from "./conteudo/PainelManutencao";
import { PainelConsideracoes } from "./conteudo/PainelConsideracoes";
import type { SecaoMeta } from "./conteudo/types";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";

const GROUPS: { label: string; scope: "proposta" | "global"; items: SecaoMeta[] }[] = [
  {
    label: "Esta proposta",
    scope: "proposta",
    items: [
      { id: "p.boas-vindas", group: "proposta", label: "Boas-vindas", description: "Mensagem do hero", icon: "MessageCircle", keywords: ["boas-vindas","welcome","hero","mensagem"] },
      { id: "p.contexto",    group: "proposta", label: "Contexto / dor", description: "Cenário do cliente", icon: "AlertCircle", keywords: ["contexto","dor","problema"] },
      { id: "p.solucao",     group: "proposta", label: "Solução", description: "Visão da solução", icon: "Lightbulb", keywords: ["solução","proposta"] },
      { id: "p.resumo",      group: "proposta", label: "Resumo executivo", description: "Carta base (IA)", icon: "FileText", keywords: ["resumo","executivo","carta","ia"] },
      { id: "p.escopo",      group: "proposta", label: "Escopo (módulos)", description: "Itens do escopo", icon: "LayoutGrid", keywords: ["escopo","módulos","itens"] },
      { id: "p.investimento",group: "proposta", label: "Investimento", description: "Valor + parcelas", icon: "DollarSign", keywords: ["investimento","preço","valor","parcelas"] },
      { id: "p.cronograma",  group: "proposta", label: "Cronograma & validade", description: "Prazos e expiração", icon: "Calendar", keywords: ["cronograma","prazo","dias","validade"] },
      { id: "p.manutencao",  group: "proposta", label: "Manutenção", description: "Mensalidade", icon: "Workflow", keywords: ["manutenção","mensal","mrr"] },
      { id: "p.consideracoes",group:"proposta", label: "Considerações", description: "Avisos / premissas", icon: "ListChecks", keywords: ["considerações","premissas","avisos"] },
    ],
  },
  {
    label: "Global · todas as propostas",
    scope: "global",
    items: [
      { id: "g.hero", group: "global", label: "Hero & navegação", description: "Etiquetas e scroll cue", icon: "Sparkles", keywords: ["hero","topo","eyebrow"] },
      { id: "g.secoes", group: "global", label: "Títulos das seções", description: "Eyebrow + título", icon: "Type", keywords: ["título","seção","eyebrow"] },
      { id: "g.sobre", group: "global", label: "Sobre a GetBrain", description: "Parágrafos institucionais", icon: "Building2", keywords: ["sobre","empresa"] },
      { id: "g.capacidades", group: "global", label: "Cards de capacidades", description: "Cards da seção Sobre", icon: "LayoutGrid", keywords: ["capacidade","card"] },
      { id: "g.stack", group: "global", label: "Stack tecnológico", description: "Tags de tecnologia", icon: "Cpu", keywords: ["stack","tecnologia"] },
      { id: "g.proximos", group: "global", label: 'CTA "Próximos passos"', description: "Bloco final", icon: "ArrowRight", keywords: ["cta","próximos"] },
      { id: "g.senha", group: "global", label: "Tela de senha", description: "Texto do gate", icon: "Lock", keywords: ["senha","gate"] },
      { id: "g.rodape", group: "global", label: "Rodapé & contato", description: "Tagline, contato", icon: "MessageCircle", keywords: ["rodapé","footer","whatsapp"] },
    ],
  },
];

const SECTION_ANCHOR: Record<string, string> = {
  "p.boas-vindas": "hero",
  "p.contexto": "contexto",
  "p.solucao": "solucao",
  "p.resumo": "carta",
  "p.escopo": "escopo",
  "p.investimento": "investimento",
  "p.cronograma": "cronograma",
  "p.manutencao": "investimento",
  "p.consideracoes": "escopo",
  "g.hero": "hero",
  "g.secoes": "contexto",
  "g.sobre": "sobre",
  "g.capacidades": "sobre",
  "g.stack": "sobre",
  "g.proximos": "proximos",
  "g.senha": "hero",
  "g.rodape": "proximos",
};

interface Props {
  proposal: ProposalDetail;
  state: any;
  setField: (field: any, value: any) => void;
  setItems: (items: any[]) => void;
  onSettingsChanged?: () => void;
  onOpenPreviewTab?: () => void;
  onPreviewAsClient: () => void;
  onOpenSendDialog: () => void;
}

export function SubTabConteudo({
  proposal, state, setField, setItems,
  onSettingsChanged, onOpenPreviewTab,
  onPreviewAsClient, onOpenSendDialog,
}: Props) {
  const { settings, isLoading, update, isSaving } = usePublicPageSettings();
  const [active, setActive] = usePersistedState<string>(
    "proposal-pagina-publica-conteudo-secao",
    "p.boas-vindas",
  );
  const [splitMode, setSplitMode] = usePersistedState<boolean>(
    "proposal-pagina-publica-split",
    true,
  );
  const [query, setQuery] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();
  const previewRef = useRef<PreviewPaneHandle>(null);
  const [bust, setBust] = useState(0);

  const persist = async (field: any, value: any) => {
    await update(field as any, value);
    setSavedAt(new Date());
    setDirty((d) => ({ ...d, [active]: false }));
    onSettingsChanged?.();
    previewRef.current?.notifySettingsChanged();
  };

  const livePatch = (patch: Record<string, any>) => {
    previewRef.current?.applyProposalPatch(patch);
  };

  // Trocou de painel → rola o iframe pra seção correspondente
  const handleChangeActive = (id: string) => {
    setActive(id);
    const anchor = SECTION_ANCHOR[id];
    if (anchor) {
      // delay curto pra não competir com possíveis remontagens
      setTimeout(() => previewRef.current?.scrollToSection(anchor), 50);
    }
  };

  const ActivePanel = useMemo(() => {
    if (!settings) return null;
    const gp = { settings, persist, setDirty: (d: boolean) => setDirty((s) => ({ ...s, [active]: d })) } as any;
    const pp = { state, setField, livePatch, setDirty: (d: boolean) => setDirty((s) => ({ ...s, [active]: d })) };
    switch (active) {
      // por-proposta
      case "p.boas-vindas": return <PainelMensagemBoasVindas {...pp} />;
      case "p.contexto":    return <PainelContexto {...pp} />;
      case "p.solucao":     return <PainelSolucao {...pp} />;
      case "p.resumo":      return <PainelResumoExecutivo {...pp} />;
      case "p.escopo":      return <PainelEscopoItens {...pp} setItems={setItems} />;
      case "p.investimento":return <PainelInvestimento {...pp} />;
      case "p.cronograma":  return <PainelCronograma {...pp} />;
      case "p.manutencao":  return <PainelManutencao {...pp} />;
      case "p.consideracoes":return <PainelConsideracoes {...pp} />;
      // globais
      case "g.hero":        return <PainelHero {...gp} />;
      case "g.secoes":      return <PainelSecoes {...gp} />;
      case "g.sobre":       return <PainelSobre {...gp} />;
      case "g.capacidades": return <PainelCapacidades {...gp} />;
      case "g.stack":       return <PainelStack {...gp} />;
      case "g.proximos":    return <PainelProximos {...gp} />;
      case "g.senha":       return <PainelSenha {...gp} />;
      case "g.rodape":      return <PainelRodape {...gp} />;
      default: return <PainelMensagemBoasVindas {...pp} />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, settings, state]);

  if (isLoading || !settings) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showSplit = splitMode && !isMobile;

  const PreviewMobile = (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="sm"
          className="fixed bottom-4 right-4 z-30 shadow-lg bg-accent hover:bg-accent/90 h-11 rounded-full gap-2"
          onClick={() => setTimeout(() => {
            const anchor = SECTION_ANCHOR[active];
            if (anchor) previewRef.current?.scrollToSection(anchor);
          }, 350)}
        >
          <Smartphone className="h-4 w-4" />
          Ver preview
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <PreviewPane
            ref={previewRef}
            proposal={proposal}
            externalRefreshKey={bust}
            className="h-full rounded-none border-0"
            onOpenInNewTab={onPreviewAsClient}
            onOpenSendDialog={onOpenSendDialog}
          />
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/20">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="h-3.5 w-3.5 text-accent shrink-0" />
          <span className="text-xs text-foreground truncate">
            <strong className="text-accent">CMS da proposta</strong>
            <span className="text-muted-foreground"> · edita textos desta proposta + conteúdo global</span>
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1 min-w-[110px] justify-end">
            {isSaving ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</>
            ) : savedAt ? (
              <><Check className="h-3 w-3 text-emerald-500" /> Salvo às {savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</>
            ) : (
              <span className="opacity-0">·</span>
            )}
          </div>
          {!isMobile && (
            <Button
              size="sm" variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setSplitMode((m) => !m)}
              title={showSplit ? "Modo foco (sem preview)" : "Modo lado a lado"}
            >
              {showSplit ? <Maximize2 className="h-3.5 w-3.5" /> : <Columns2 className="h-3.5 w-3.5" />}
              <span className="hidden md:inline">{showSplit ? "Foco" : "Lado a lado"}</span>
            </Button>
          )}
          {onOpenPreviewTab && (
            <Button
              size="sm" variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={() => {
                if (showSplit) {
                  // só re-aponta a seção atual no preview embutido
                  const anchor = SECTION_ANCHOR[active];
                  if (anchor) previewRef.current?.scrollToSection(anchor);
                } else {
                  onOpenPreviewTab();
                }
              }}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pré-visualizar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Layout: sidebar | editor | preview */}
      <div className="flex flex-col md:flex-row gap-4">
        <SidebarConteudo
          groups={GROUPS}
          active={active}
          onChange={handleChangeActive}
          query={query}
          onQueryChange={setQuery}
          dirty={dirty}
        />

        <div className={`flex-1 min-w-0 ${showSplit ? "lg:max-w-[560px]" : ""}`}>
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            {ActivePanel}
          </div>
        </div>

        {showSplit && (
          <div className="hidden lg:flex flex-1 min-w-0">
            <PreviewPane
              ref={previewRef}
              proposal={proposal}
              externalRefreshKey={bust}
              className="h-[calc(100vh-220px)] sticky top-4 w-full"
              onOpenInNewTab={onPreviewAsClient}
              onOpenSendDialog={onOpenSendDialog}
            />
          </div>
        )}
      </div>

      {/* Em mobile/sem split: botão flutuante para abrir o preview em sheet */}
      {(isMobile || !splitMode) && PreviewMobile}
    </div>
  );
}
