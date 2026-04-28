import CategoriasTab from "@/components/config-financeiras/CategoriasTab";
import FinTabWithSearch from "./FinTabWithSearch";
export default function FinCategoriasPage() {
  return <FinTabWithSearch Component={CategoriasTab} placeholder="Buscar categorias…" />;
}
