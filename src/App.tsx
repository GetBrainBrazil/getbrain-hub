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

import Orcamento from "./pages/Orcamento";
import Relatorios from "./pages/Relatorios";
import ExtratosBancarios from "./pages/ExtratosBancarios";
import ExtratoMovimentacaoDetalhe from "./pages/ExtratoMovimentacaoDetalhe";
import ConfiguracoesFinanceiras from "./pages/ConfiguracoesFinanceiras";
import Projetos from "./pages/Projetos";
import ProjetoDetalhe from "./pages/ProjetoDetalhe";
import AreaDev from "./pages/AreaDev";
import Clientes from "./pages/Clientes";
import Configuracoes from "./pages/Configuracoes";
import Suporte from "./pages/Suporte";
import Tokens from "./pages/Tokens";
import ContratosManutencao from "./pages/ContratosManutencao";
import Vendas from "./pages/Vendas";
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
            <Route path="/financeiro/vendas" element={<ProtectedRoute><Vendas /></ProtectedRoute>} />
            <Route path="/financeiro/movimentacoes" element={<ProtectedRoute><Movimentacoes /></ProtectedRoute>} />
            <Route path="/financeiro/movimentacoes/novo/:tipo" element={<ProtectedRoute><MovimentacaoDetalhe /></ProtectedRoute>} />
            <Route path="/financeiro/movimentacoes/:id" element={<ProtectedRoute><MovimentacaoDetalhe /></ProtectedRoute>} />
            
            <Route path="/financeiro/orcamento" element={<ProtectedRoute><Orcamento /></ProtectedRoute>} />
            <Route path="/financeiro/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
            <Route path="/financeiro/extratos" element={<ProtectedRoute><ExtratosBancarios /></ProtectedRoute>} />
            <Route path="/financeiro/extratos/movimentacao/:id" element={<ProtectedRoute><ExtratoMovimentacaoDetalhe /></ProtectedRoute>} />
            <Route path="/financeiro/configuracoes" element={<ProtectedRoute><ConfiguracoesFinanceiras /></ProtectedRoute>} />
            <Route path="/financeiro/contratos" element={<ProtectedRoute><ContratosManutencao /></ProtectedRoute>} />
            <Route path="/projetos" element={<ProtectedRoute><Projetos /></ProtectedRoute>} />
            <Route path="/projetos/:id" element={<ProtectedRoute><ProjetoDetalhe /></ProtectedRoute>} />
            <Route path="/area-dev" element={<ProtectedRoute><AreaDev /></ProtectedRoute>} />
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
