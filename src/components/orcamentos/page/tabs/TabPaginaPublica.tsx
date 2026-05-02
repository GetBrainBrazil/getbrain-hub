/**
 * Tab "Página Pública" — wrapper que delega para o novo módulo `pagina-publica/`.
 */
import { PaginaPublicaTab } from "./pagina-publica";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";

interface Props {
  proposal: ProposalDetail;
  state: any;
  setField: (field: any, value: any) => void;
  setItems: (items: any[]) => void;
  onPreviewAsClient: () => void;
  onOpenSendDialog: () => void;
  onPasswordUpdated: () => void;
}

export function TabPaginaPublica(props: Props) {
  return <PaginaPublicaTab {...props} />;
}
