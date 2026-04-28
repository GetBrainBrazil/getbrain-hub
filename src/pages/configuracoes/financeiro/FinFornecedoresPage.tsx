import FornecedoresTab from "@/components/config-financeiras/FornecedoresTab";
import FinTabWithSearch from "./FinTabWithSearch";
export default function FinFornecedoresPage() {
  return <FinTabWithSearch Component={FornecedoresTab} placeholder="Buscar fornecedores…" />;
}
