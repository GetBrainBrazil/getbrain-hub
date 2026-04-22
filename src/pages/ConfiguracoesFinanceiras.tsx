import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Landmark, Users, Truck, Target, Tags, UserRound, Lightbulb, X, RefreshCw } from "lucide-react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useURLState } from "@/hooks/useURLState";
import { HelpTooltip } from "@/components/HelpTooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [activeTab, setActiveTab] = useURLState<string>("tab", "contas");
  // Migrate legacy "plano" value to "colaboradores"
  useEffect(() => { if (activeTab === "plano") setActiveTab("colaboradores"); }, []);
  const [search, setSearch] = useURLState<string>("busca", "");
  const [tipDismissed, setTipDismissed] = usePersistedState<boolean>("config_fin_tip_dismissed", false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Configurações Financeiras
          <HelpTooltip content="Aqui você configura todos os dados base do seu financeiro: contas bancárias, pessoas, categorias e centros de custo. Esses dados alimentam todo o sistema." />
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie contas, categorias, clientes, fornecedores e centros de custo</p>
      </div>

      {!tipDismissed && (
        <div className="flex items-start gap-3 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 dark:border-cyan-900/50 dark:bg-cyan-950/30">
          <Lightbulb className="h-5 w-5 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm text-cyan-900 dark:text-cyan-100">
            <strong>Dica:</strong> comece cadastrando suas contas bancárias e categorias. Depois adicione fornecedores e clientes. Essas informações são usadas em todo o módulo financeiro.
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-cyan-700 hover:text-cyan-900 hover:bg-cyan-100 dark:text-cyan-300 dark:hover:bg-cyan-900/40" onClick={() => setTipDismissed(true)}>
            Entendi
          </Button>
          <button onClick={() => setTipDismissed(true)} className="text-cyan-600/70 hover:text-cyan-800 dark:text-cyan-400/70" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
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
