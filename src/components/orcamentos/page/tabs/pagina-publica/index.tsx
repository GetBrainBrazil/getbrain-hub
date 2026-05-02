/**
 * Wrapper da tab "Página Pública" — agora dividida em 2 sub-abas:
 *   1. Acesso & Preview — link, senha, mockup e pré-visualização ao vivo
 *   2. Conteúdo        — editor global de textos institucionais
 *
 * Persistência da sub-aba ativa via usePersistedState.
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, Type } from "lucide-react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useRef, useState } from "react";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";
import { SubTabAcesso, type SubTabAcessoHandle } from "./SubTabAcesso";
import { SubTabConteudo } from "./SubTabConteudo";

interface Props {
  proposal: ProposalDetail;
  state: { clientName: string; mockupUrl: string };
  setField: (field: any, value: any) => void;
  onPreviewAsClient: () => void;
  onOpenSendDialog: () => void;
  onPasswordUpdated: () => void;
}

export function PaginaPublicaTab(props: Props) {
  const [active, setActive] = usePersistedState<string>(
    "proposal-pagina-publica-subtab",
    "acesso",
  );
  // bumped sempre que o conteúdo global muda → força reload do iframe
  const [previewBust, setPreviewBust] = useState(0);
  const acessoRef = useRef<SubTabAcessoHandle>(null);

  const handleOpenPreview = () => {
    setActive("acesso");
    // dá um tick para a tab montar antes de fazer scroll
    setTimeout(() => acessoRef.current?.scrollToPreview(), 80);
  };

  return (
    <Tabs value={active} onValueChange={setActive} className="w-full">
      <TabsList className="grid grid-cols-2 w-full sm:w-auto sm:inline-grid">
        <TabsTrigger value="acesso" className="gap-1.5 text-xs">
          <Link2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Acesso & Preview</span>
          <span className="sm:hidden">Acesso</span>
        </TabsTrigger>
        <TabsTrigger value="conteudo" className="gap-1.5 text-xs">
          <Type className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Conteúdo</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="acesso" className="mt-4">
        <SubTabAcesso ref={acessoRef} {...props} previewBust={previewBust} />
      </TabsContent>
      <TabsContent value="conteudo" className="mt-4">
        <SubTabConteudo
          onSettingsChanged={() => setPreviewBust((k) => k + 1)}
          onOpenPreview={handleOpenPreview}
        />
      </TabsContent>
    </Tabs>
  );
}
