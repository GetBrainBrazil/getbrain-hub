/**
 * Wrapper fino para o CRM — usa o painel compartilhado e habilita papéis comerciais.
 * Mantido para não quebrar importadores existentes (DealHeader, CrmDealDetail, etc).
 */
import { CompanyContactsPanel } from "@/components/shared/CompanyContactsPanel";

interface Props {
  companyId: string;
  primaryContactId: string | null;
  onMakePrimary?: (personId: string | null) => void;
}

export function CompanyContactsManager({ companyId, primaryContactId, onMakePrimary }: Props) {
  return (
    <CompanyContactsPanel
      companyId={companyId}
      companyLabel="esta empresa"
      showRoles
      primaryContactPersonId={primaryContactId}
      onMakePrimary={onMakePrimary}
    />
  );
}
