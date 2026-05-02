import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { RouteTracker, getLastRoute, isReturnableRoute } from "@/components/RouteTracker";
import Login from "./pages/Login";
import Index from "./pages/Index";
import FinanceiroVisaoGeral from "./pages/FinanceiroVisaoGeral";
import Movimentacoes from "./pages/Movimentacoes";
import MovimentacaoDetalhe from "./pages/MovimentacaoDetalhe";
import Recorrencias from "./pages/financeiro/Recorrencias";
import RecorrenciaDetalhe from "./pages/financeiro/RecorrenciaDetalhe";
import Orcamentos from "./pages/financeiro/Orcamentos";
import OrcamentoEditarDetalhe from "./pages/financeiro/OrcamentoEditarDetalhe";
import PropostaPublica from "./pages/public/PropostaPublica";

import Orcamento from "./pages/Orcamento";
import Relatorios from "./pages/Relatorios";
import ExtratosBancarios from "./pages/ExtratosBancarios";
import ExtratoMovimentacaoDetalhe from "./pages/ExtratoMovimentacaoDetalhe";
import ConfiguracoesFinanceiras from "./pages/ConfiguracoesFinanceiras";
import Projetos from "./pages/Projetos";
import ProjetoDetalhe from "./pages/ProjetoDetalhe";
import ProjetoFinanceiroDetalhe from "./pages/projetos/ProjetoFinanceiroDetalhe";
import ProjetoTarefasDetalhe from "./pages/projetos/ProjetoTarefasDetalhe";
import ProjetoSuporteDetalhe from "./pages/projetos/ProjetoSuporteDetalhe";
import ProjetoTokensDetalhe from "./pages/projetos/ProjetoTokensDetalhe";
import DevLayout from "./components/dev/DevLayout";
import DevDashboard from "./pages/dev/DevDashboard";
import DevKanban from "./pages/dev/DevKanban";
import DevSprints from "./pages/dev/DevSprints";
import DevBacklog from "./pages/dev/DevBacklog";
import TaskDetail from "./pages/dev/TaskDetail";
import CrmLayout from "./pages/crm/CrmLayout";
import CrmPipeline from "./pages/crm/CrmPipeline";
import CrmCompanyDetail from "./pages/crm/CrmCompanyDetail";
import CrmDealDetail from "./pages/crm/CrmDealDetail";
import CrmDashboard from "./pages/crm/CrmDashboard";
import CrmCalendar from "./pages/crm/CrmCalendar";
import CrmLeadsAndCompanies from "./pages/crm/CrmLeadsAndCompanies";

import CrmLeadDetail from "./pages/crm/CrmLeadDetail";
import Clientes from "./pages/Clientes";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminUsuariosList from "./pages/admin/AdminUsuariosList";
import UsuarioFichaPage from "./pages/admin/UsuarioFichaPage";
import AdminPermissoesPage from "./pages/admin/AdminPermissoesPage";
import AdminAuditoriaPage from "./pages/admin/AdminAuditoriaPage";
import AdminPropostasIaPage from "./pages/admin/AdminPropostasIaPage";
import IaPropostasPage from "./pages/configuracoes/integracoes/IaPropostasPage";
import EtapasFunilPage from "./pages/configuracoes/crm/EtapasFunilPage";
import MotivosDescartePage from "./pages/configuracoes/crm/MotivosDescartePage";
import Suporte from "./pages/Suporte";
import Tokens from "./pages/Tokens";
import ContratosManutencao from "./pages/ContratosManutencao";
import Setores from "./pages/configuracoes/Setores";
import ConfiguracoesLayout from "./pages/configuracoes/ConfiguracoesLayout";
import PapeisContatoPage from "./pages/configuracoes/pessoas/PapeisContatoPage";
import OrigensLeadPage from "./pages/configuracoes/pessoas/OrigensLeadPage";
import CargosPage from "./pages/configuracoes/pessoas/CargosPage";
import CategoriasDorPage from "./pages/configuracoes/pessoas/CategoriasDorPage";
import TiposProjetoPage from "./pages/configuracoes/pessoas/TiposProjetoPage";
import FinContasPage from "./pages/configuracoes/financeiro/FinContasPage";
import FinCategoriasPage from "./pages/configuracoes/financeiro/FinCategoriasPage";
import FinCentrosPage from "./pages/configuracoes/financeiro/FinCentrosPage";
import FinClientesPage from "./pages/configuracoes/financeiro/FinClientesPage";
import FinFornecedoresPage from "./pages/configuracoes/financeiro/FinFornecedoresPage";
import FinColaboradoresPage from "./pages/configuracoes/financeiro/FinColaboradoresPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
}

/** Redirects "/" to the last visited route (sessionStorage) if available */
function HomeRedirect() {
  const lastRoute = getLastRoute();
  if (isReturnableRoute(lastRoute)) {
    return <Navigate to={lastRoute} replace />;
  }
  return <ProtectedRoute><Index /></ProtectedRoute>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RouteTracker />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/p/:token" element={<PropostaPublica />} />
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><FinanceiroVisaoGeral /></ProtectedRoute>} />
            <Route path="/financeiro/vendas" element={<Navigate to="/financeiro" replace />} />
            <Route path="/financeiro/movimentacoes" element={<ProtectedRoute><Movimentacoes /></ProtectedRoute>} />
            <Route path="/financeiro/movimentacoes/novo/:tipo" element={<ProtectedRoute><MovimentacaoDetalhe /></ProtectedRoute>} />
            <Route path="/financeiro/movimentacoes/:id" element={<ProtectedRoute><MovimentacaoDetalhe /></ProtectedRoute>} />
            <Route path="/financeiro/recorrencias" element={<ProtectedRoute><Recorrencias /></ProtectedRoute>} />
            <Route path="/financeiro/recorrencias/:id" element={<ProtectedRoute><RecorrenciaDetalhe /></ProtectedRoute>} />
            <Route path="/financeiro/orcamentos" element={<ProtectedRoute><Orcamentos /></ProtectedRoute>} />
            <Route path="/financeiro/orcamentos/:id/editar" element={<ProtectedRoute><OrcamentoEditarDetalhe /></ProtectedRoute>} />
            
            <Route path="/financeiro/orcamento" element={<ProtectedRoute><Orcamento /></ProtectedRoute>} />
            <Route path="/financeiro/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
            <Route path="/financeiro/extratos" element={<ProtectedRoute><ExtratosBancarios /></ProtectedRoute>} />
            <Route path="/financeiro/extratos/movimentacao/:id" element={<ProtectedRoute><ExtratoMovimentacaoDetalhe /></ProtectedRoute>} />
            <Route path="/financeiro/configuracoes" element={<Navigate to="/configuracoes/financeiro/contas" replace />} />
            <Route path="/financeiro/contratos" element={<ProtectedRoute><ContratosManutencao /></ProtectedRoute>} />
            <Route path="/projetos" element={<ProtectedRoute><Projetos /></ProtectedRoute>} />
            <Route path="/projetos/:id" element={<ProtectedRoute><ProjetoDetalhe /></ProtectedRoute>} />
            <Route path="/projetos/:id/financeiro" element={<ProtectedRoute><ProjetoFinanceiroDetalhe /></ProtectedRoute>} />
            <Route path="/projetos/:id/tarefas" element={<ProtectedRoute><ProjetoTarefasDetalhe /></ProtectedRoute>} />
            <Route path="/projetos/:id/suporte" element={<ProtectedRoute><ProjetoSuporteDetalhe /></ProtectedRoute>} />
            <Route path="/projetos/:id/tokens" element={<ProtectedRoute><ProjetoTokensDetalhe /></ProtectedRoute>} />
            <Route path="/area-dev" element={<Navigate to="/dev/kanban" replace />} />
            <Route path="/dev" element={<ProtectedRoute><DevLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DevDashboard />} />
              <Route path="kanban" element={<DevKanban />} />
              <Route path="sprints" element={<DevSprints />} />
              <Route path="backlog" element={<DevBacklog />} />
            </Route>
            {/* Tela cheia da task — fora do DevLayout (sem sub-tabs do hub) */}
            <Route path="/dev/tasks/:code" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
            <Route path="/crm/deals/:code" element={<ProtectedRoute><CrmDealDetail /></ProtectedRoute>} />
            <Route path="/crm/leads/:code" element={<ProtectedRoute><CrmLeadDetail /></ProtectedRoute>} />
            <Route path="/crm/empresas/:id" element={<ProtectedRoute><CrmCompanyDetail /></ProtectedRoute>} />
            <Route path="/crm" element={<ProtectedRoute><CrmLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="pipeline" replace />} />
              <Route path="dashboard" element={<CrmDashboard />} />
              <Route path="pipeline" element={<CrmPipeline />} />
              <Route path="leads" element={<CrmLeadsAndCompanies />} />
              <Route path="empresas" element={<Navigate to="/crm/leads" replace />} />
              <Route path="calendario" element={<CrmCalendar />} />
              <Route path="configuracoes" element={<Navigate to="/configuracoes/crm/etapas" replace />} />
            </Route>
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            {/* Centro de Configurações Gerais (admin-only) */}
            <Route path="/configuracoes" element={<AdminRoute><ConfiguracoesLayout /></AdminRoute>}>
              <Route index element={<Navigate to="pessoas/setores" replace />} />
              <Route path="pessoas/setores" element={<Setores />} />
              <Route path="pessoas/papeis-contato" element={<PapeisContatoPage />} />
              <Route path="pessoas/origens" element={<OrigensLeadPage />} />
              <Route path="pessoas/categorias-dor" element={<CategoriasDorPage />} />
              <Route path="pessoas/tipos-projeto" element={<TiposProjetoPage />} />
              <Route path="pessoas/cargos" element={<CargosPage />} />
              <Route path="financeiro/contas" element={<FinContasPage />} />
              <Route path="financeiro/categorias" element={<FinCategoriasPage />} />
              <Route path="financeiro/centros" element={<FinCentrosPage />} />
              <Route path="financeiro/clientes" element={<FinClientesPage />} />
              <Route path="financeiro/fornecedores" element={<FinFornecedoresPage />} />
              <Route path="financeiro/colaboradores" element={<FinColaboradoresPage />} />
              <Route path="sistema/usuarios" element={<AdminUsuariosList />} />
              <Route path="sistema/permissoes" element={<AdminPermissoesPage />} />
              <Route path="sistema/logs" element={<Navigate to="/configuracoes/sistema/auditoria" replace />} />
              <Route path="sistema/auditoria" element={<AdminAuditoriaPage />} />
              <Route path="integracoes/ia-propostas" element={<IaPropostasPage />} />
              <Route path="crm/etapas" element={<EtapasFunilPage />} />
              <Route path="crm/motivos-descarte" element={<MotivosDescartePage />} />
            </Route>
            {/* Compat: rota antiga /configuracoes/setores */}
            <Route path="/configuracoes/setores" element={<Navigate to="/configuracoes/pessoas/setores" replace />} />
            <Route path="/perfil" element={<ProtectedRoute><UsuarioFichaPage mode="perfil" /></ProtectedRoute>} />
            {/* Compat: /admin/* foi unificado em /configuracoes/* */}
            <Route path="/admin" element={<Navigate to="/configuracoes/sistema/usuarios" replace />} />
            <Route path="/admin/usuarios" element={<Navigate to="/configuracoes/sistema/usuarios" replace />} />
            <Route path="/admin/permissoes" element={<Navigate to="/configuracoes/sistema/permissoes" replace />} />
            <Route path="/admin/auditoria" element={<Navigate to="/configuracoes/sistema/auditoria" replace />} />
            <Route path="/admin/logs" element={<Navigate to="/configuracoes/sistema/auditoria" replace />} />
            <Route path="/admin/agencia" element={<Navigate to="/configuracoes/sistema/usuarios" replace />} />
            <Route path="/admin/propostas-ia" element={<Navigate to="/configuracoes/integracoes/ia-propostas" replace />} />
            <Route path="/admin/usuarios/:id" element={<AdminRoute><UsuarioFichaPage mode="admin" /></AdminRoute>} />
            <Route path="/suporte" element={<ProtectedRoute><Suporte /></ProtectedRoute>} />
            <Route path="/tokens" element={<ProtectedRoute><Tokens /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
