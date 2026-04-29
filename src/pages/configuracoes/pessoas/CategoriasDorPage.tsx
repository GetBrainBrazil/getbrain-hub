import { PainCategoriesManager } from "@/components/crm/settings/PainCategoriesManager";
import { useAuth } from "@/contexts/AuthContext";

export default function CategoriasDorPage() {
  const { isAdmin } = useAuth();
  return <PainCategoriesManager canEdit={isAdmin} />;
}
