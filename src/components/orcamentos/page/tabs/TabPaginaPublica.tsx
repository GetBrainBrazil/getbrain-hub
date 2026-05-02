/**
 * Tab "Página Pública" — wrapper que delega para o novo módulo
 * `pagina-publica/` com 3 sub-abas (Acesso, Conteúdo, Pré-visualização).
 */
import { PaginaPublicaTab } from "./pagina-publica";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";

interface Props {
  proposal: ProposalDetail;
  state: { clientName: string; mockupUrl: string };
  setField: (field: any, value: any) => void;
  onPreviewAsClient: () => void;
  onOpenSendDialog: () => void;
  onPasswordUpdated: () => void;
}

export function TabPaginaPublica(props: Props) {
  return <PaginaPublicaTab {...props} />;
}
