import { ContactRolesManager } from "@/components/crm/settings/ContactRolesManager";
import { useAuth } from "@/contexts/AuthContext";

export default function PapeisContatoPage() {
  const { isAdmin } = useAuth();
  return <ContactRolesManager canEdit={isAdmin} />;
}
