import ContasBancariasTab from "@/components/config-financeiras/ContasBancariasTab";
import FinTabWithSearch from "./FinTabWithSearch";
export default function FinContasPage() {
  return <FinTabWithSearch Component={ContasBancariasTab} placeholder="Buscar contas…" />;
}
