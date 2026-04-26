import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { RouteTracker, getLastRoute } from "@/components/RouteTracker";
import Login from "./pages/Login";
import Index from "./pages/Index";
import FinanceiroVisaoGeral from "./pages/FinanceiroVisaoGeral";
import Movimentacoes from "./pages/Movimentacoes";
import MovimentacaoDetalhe from "./pages/MovimentacaoDetalhe";
import Recorrencias from "./pages/financeiro/Recorrencias";
import RecorrenciaDetalhe from "./pages/financeiro/RecorrenciaDetalhe";
import Orcamentos from "./pages/financeiro/Orcamentos";
import OrcamentoEditarDetalhe from "./pages/financeiro/OrcamentoEditarDetalhe";

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
import CrmEmpresas from "./pages/crm/CrmEmpresas";
import CrmCalendar from "./pages/crm/CrmCalendar";
import CrmLeads from "./pages/crm/CrmLeads";
import CrmLeadDetail from "./pages/crm/CrmLeadDetail";
import Clientes from "./pages/Clientes";
import Configuracoes from "./pages/Configuracoes";
import Suporte from "./pages/Suporte";
import Tokens from "./pages/Tokens";
import ContratosManutencao from "./pages/ContratosManutencao";
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

/** Redirects "/" to the last visited route (sessionStorage) if available */
function HomeRedirect() {
  const lastRoute = getLastRoute();
  if (lastRoute && lastRoute !== "/") {
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
            <Route path="/" element={<HomeRedirect />} />
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
            <Route path="/financeiro/configuracoes" element={<ProtectedRoute><ConfiguracoesFinanceiras /></ProtectedRoute>} />
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
              <Route path="leads" element={<CrmLeads />} />
              <Route path="empresas" element={<CrmEmpresas />} />
              <Route path="calendario" element={<CrmCalendar />} />
            </Route>
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
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
