import ClientesTab from "@/components/config-financeiras/ClientesTab";
import FinTabWithSearch from "./FinTabWithSearch";
export default function FinClientesPage() {
  return <FinTabWithSearch Component={ClientesTab} placeholder="Buscar clientes…" />;
}
