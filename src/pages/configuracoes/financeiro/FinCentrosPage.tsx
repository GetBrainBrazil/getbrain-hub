import CentrosCustoTab from "@/components/config-financeiras/CentrosCustoTab";
import FinTabWithSearch from "./FinTabWithSearch";
export default function FinCentrosPage() {
  return <FinTabWithSearch Component={CentrosCustoTab} placeholder="Buscar centros de custo…" />;
}
