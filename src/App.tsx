import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Index from "./pages/Index";
import FinanceiroVisaoGeral from "./pages/FinanceiroVisaoGeral";
import ContasReceber from "./pages/ContasReceber";
import ContasPagar from "./pages/ContasPagar";
import Transacoes from "./pages/Transacoes";
import Orcamento from "./pages/Orcamento";
import Relatorios from "./pages/Relatorios";
import Projetos from "./pages/Projetos";
import Clientes from "./pages/Clientes";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><FinanceiroVisaoGeral /></ProtectedRoute>} />
            <Route path="/financeiro/receber" element={<ProtectedRoute><ContasReceber /></ProtectedRoute>} />
            <Route path="/financeiro/pagar" element={<ProtectedRoute><ContasPagar /></ProtectedRoute>} />
            <Route path="/financeiro/transacoes" element={<ProtectedRoute><Transacoes /></ProtectedRoute>} />
            <Route path="/financeiro/orcamento" element={<ProtectedRoute><Orcamento /></ProtectedRoute>} />
            <Route path="/financeiro/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
            <Route path="/projetos" element={<ProtectedRoute><Projetos /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
