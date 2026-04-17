import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Landmark, Users, Truck, Target, Tags, UserRound, Lightbulb, X } from "lucide-react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { HelpTooltip } from "@/components/HelpTooltip";

import ContasBancariasTab from "@/components/config-financeiras/ContasBancariasTab";
import ColaboradoresTab from "@/components/config-financeiras/ColaboradoresTab";
import ClientesTab from "@/components/config-financeiras/ClientesTab";
import FornecedoresTab from "@/components/config-financeiras/FornecedoresTab";
import CentrosCustoTab from "@/components/config-financeiras/CentrosCustoTab";
import CategoriasTab from "@/components/config-financeiras/CategoriasTab";

const tabConfig = {
  contas: { label: "Contas Bancárias", icon: Landmark },
  colaboradores: { label: "Colaboradores", icon: UserRound },
  clientes: { label: "Clientes", icon: Users },
  fornecedores: { label: "Fornecedores", icon: Truck },
  centros: { label: "Centros de Custo", icon: Target },
  categorias: { label: "Categorias", icon: Tags },
};

type TabKey = keyof typeof tabConfig;

export default function ConfiguracoesFinanceiras() {
  const [activeTab, setActiveTab] = usePersistedState<TabKey>("fin_config_tab", "contas");
  // Migrate legacy "plano" value to "colaboradores"
  useEffect(() => { if ((activeTab as string) === "plano") setActiveTab("colaboradores"); }, []);
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações Financeiras</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie contas, categorias, clientes, fornecedores e centros de custo</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabKey); setSearch(""); }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            {Object.entries(tabConfig).map(([key, cfg]) => (
              <TabsTrigger key={key} value={key} className="gap-1.5"><cfg.icon className="h-4 w-4" />{cfg.label}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="contas"><ContasBancariasTab search={search} /></TabsContent>
        <TabsContent value="colaboradores"><ColaboradoresTab search={search} /></TabsContent>
        <TabsContent value="clientes"><ClientesTab search={search} /></TabsContent>
        <TabsContent value="fornecedores"><FornecedoresTab search={search} /></TabsContent>
        <TabsContent value="centros"><CentrosCustoTab search={search} /></TabsContent>
        <TabsContent value="categorias"><CategoriasTab search={search} /></TabsContent>
      </Tabs>
    </div>
  );
}
