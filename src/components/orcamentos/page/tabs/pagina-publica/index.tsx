/**
 * Wrapper da tab "Página Pública" — duas sub-abas:
 *   1. Acesso & Preview — link, senha, mockup e pré-visualização ao vivo
 *   2. Conteúdo        — CMS completo (global + por-proposta) com preview embutido
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
  state: any;
  setField: (field: any, value: any) => void;
  setItems: (items: any[]) => void;
  onPreviewAsClient: () => void;
  onOpenSendDialog: () => void;
  onPasswordUpdated: () => void;
}

export function PaginaPublicaTab(props: Props) {
  const [active, setActive] = usePersistedState<string>(
    "proposal-pagina-publica-subtab",
    "acesso",
  );
  const [previewBust, setPreviewBust] = useState(0);
  const acessoRef = useRef<SubTabAcessoHandle>(null);

  const handleOpenPreview = () => {
    setActive("acesso");
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
        <SubTabAcesso
          ref={acessoRef}
          proposal={props.proposal}
          state={props.state}
          setField={props.setField}
          onPreviewAsClient={props.onPreviewAsClient}
          onOpenSendDialog={props.onOpenSendDialog}
          onPasswordUpdated={props.onPasswordUpdated}
          previewBust={previewBust}
        />
      </TabsContent>
      <TabsContent value="conteudo" className="mt-4">
        <SubTabConteudo
          proposal={props.proposal}
          state={props.state}
          setField={props.setField}
          setItems={props.setItems}
          onSettingsChanged={() => setPreviewBust((k) => k + 1)}
          onOpenPreviewTab={handleOpenPreview}
          onPreviewAsClient={props.onPreviewAsClient}
          onOpenSendDialog={props.onOpenSendDialog}
        />
      </TabsContent>
    </Tabs>
  );
}
