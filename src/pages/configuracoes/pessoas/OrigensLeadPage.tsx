import { LeadSourcesManager } from "@/components/crm/settings/LeadSourcesManager";
import { useAuth } from "@/contexts/AuthContext";

export default function OrigensLeadPage() {
  const { isAdmin } = useAuth();
  return <LeadSourcesManager canEdit={isAdmin} />;
}
