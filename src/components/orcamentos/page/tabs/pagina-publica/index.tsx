/**
 * Wrapper da tab "Página Pública" remodelada. Agora dividida em 3 sub-abas:
 *   1. Acesso         — link, senha, mockup
 *   2. Conteúdo       — editor global de textos institucionais
 *   3. Pré-visualização — iframe ao vivo
 *
 * Persistência da sub-aba ativa via usePersistedState.
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, Type, Eye } from "lucide-react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useState } from "react";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";
import { SubTabAcesso } from "./SubTabAcesso";
import { SubTabConteudo } from "./SubTabConteudo";
import { SubTabPreview } from "./SubTabPreview";

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

  return (
    <Tabs value={active} onValueChange={setActive} className="w-full">
      <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-grid">
        <TabsTrigger value="acesso" className="gap-1.5 text-xs">
          <Link2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Acesso</span>
        </TabsTrigger>
        <TabsTrigger value="conteudo" className="gap-1.5 text-xs">
          <Type className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Conteúdo</span>
        </TabsTrigger>
        <TabsTrigger value="preview" className="gap-1.5 text-xs">
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Pré-visualização</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="acesso" className="mt-4">
        <SubTabAcesso {...props} />
      </TabsContent>
      <TabsContent value="conteudo" className="mt-4">
        <SubTabConteudo onSettingsChanged={() => setPreviewBust((k) => k + 1)} />
      </TabsContent>
      <TabsContent value="preview" className="mt-4">
        <SubTabPreview
          proposal={props.proposal}
          onPreviewAsClient={props.onPreviewAsClient}
          onOpenSendDialog={props.onOpenSendDialog}
          externalRefreshKey={previewBust}
        />
      </TabsContent>
    </Tabs>
  );
}
