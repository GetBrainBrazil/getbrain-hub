/**
 * Wrapper fino — usa o painel compartilhado entre Projetos e CRM.
 * Mantido este arquivo para preservar imports existentes.
 */
import { CompanyContactsPanel } from "@/components/shared/CompanyContactsPanel";

export function CardContatos({ companyId, companyLabel }: { companyId: string | null; companyLabel: string }) {
  return <CompanyContactsPanel companyId={companyId} companyLabel={companyLabel} />;
}
