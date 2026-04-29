import { ProjectTypesManager } from "@/components/crm/settings/ProjectTypesManager";
import { useAuth } from "@/contexts/AuthContext";

export default function TiposProjetoPage() {
  const { isAdmin } = useAuth();
  return <ProjectTypesManager canEdit={isAdmin} />;
}
