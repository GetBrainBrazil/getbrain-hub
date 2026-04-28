import ColaboradoresTab from "@/components/config-financeiras/ColaboradoresTab";
import FinTabWithSearch from "./FinTabWithSearch";
export default function FinColaboradoresPage() {
  return <FinTabWithSearch Component={ColaboradoresTab} placeholder="Buscar colaboradores…" />;
}
