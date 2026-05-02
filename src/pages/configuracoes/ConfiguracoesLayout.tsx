/**
 * Centro de Configurações Gerais — admin-only.
 *
 * Centraliza catálogos compartilhados entre módulos:
 *   - Pessoas & Empresas (Setores, Papéis de Contato, Origens de Lead, Cargos)
 *   - Financeiro (Contas, Categorias, Centros de Custo, Clientes, Fornecedores, Colaboradores)
 *   - Sistema (Usuários, Permissões, Logs)
 *
 * Acesso restrito a usuários com `isAdmin`. As rotas antigas
 * (`/financeiro/configuracoes`, `/admin/*`, `/configuracoes/setores`)
 * redirecionam para as sub-abas equivalentes daqui.
 */
import { useMemo } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Lock, Settings2, Building2, Users, Tag, Briefcase, Wallet,
  Shield, History, FolderTree, UserRound, Truck, Landmark,
  Tags, Target, Layers, Sparkles, Plug, Workflow, XCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type SubTab = { key: string; label: string; path: string; icon: React.ComponentType<{ className?: string }> };
type Section = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; tabs: SubTab[] };

const SECTIONS: Section[] = [
  {
    key: "crm",
    label: "CRM",
    icon: Workflow,
    tabs: [
      { key: "etapas", label: "Etapas do funil", path: "/configuracoes/crm/etapas", icon: Workflow },
      { key: "motivos-descarte", label: "Motivos de descarte", path: "/configuracoes/crm/motivos-descarte", icon: XCircle },
      { key: "origens", label: "Origens de Lead", path: "/configuracoes/crm/origens", icon: Tag },
      { key: "papeis-contato", label: "Papéis de Contato", path: "/configuracoes/crm/papeis-contato", icon: Users },
      { key: "categorias-dor", label: "Categorias de Dor", path: "/configuracoes/crm/categorias-dor", icon: Tags },
    ],
  },
  {
    key: "projetos",
    label: "Projetos",
    icon: Layers,
    tabs: [
      { key: "tipos-projeto", label: "Tipos de Projeto", path: "/configuracoes/projetos/tipos", icon: Layers },
    ],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: Wallet,
    tabs: [
      { key: "contas", label: "Contas Bancárias", path: "/configuracoes/financeiro/contas", icon: Landmark },
      { key: "categorias", label: "Categorias", path: "/configuracoes/financeiro/categorias", icon: Tags },
      { key: "centros", label: "Centros de Custo", path: "/configuracoes/financeiro/centros", icon: Target },
      { key: "clientes", label: "Clientes", path: "/configuracoes/financeiro/clientes", icon: Users },
      { key: "fornecedores", label: "Fornecedores", path: "/configuracoes/financeiro/fornecedores", icon: Truck },
      { key: "colaboradores", label: "Colaboradores", path: "/configuracoes/financeiro/colaboradores", icon: UserRound },
    ],
  },
  {
    key: "pessoas",
    label: "Pessoas & Empresas",
    icon: Building2,
    tabs: [
      { key: "setores", label: "Setores", path: "/configuracoes/pessoas/setores", icon: FolderTree },
      { key: "cargos", label: "Cargos Internos", path: "/configuracoes/pessoas/cargos", icon: Briefcase },
    ],
  },
  {
    key: "sistema",
    label: "Sistema",
    icon: Shield,
    tabs: [
      { key: "usuarios", label: "Usuários", path: "/configuracoes/sistema/usuarios", icon: Users },
      { key: "permissoes", label: "Permissões", path: "/configuracoes/sistema/permissoes", icon: Shield },
      { key: "auditoria", label: "Auditoria", path: "/configuracoes/sistema/auditoria", icon: History },
    ],
  },
  {
    key: "integracoes",
    label: "Integrações",
    icon: Plug,
    tabs: [
      { key: "ia-propostas", label: "IA das Propostas", path: "/configuracoes/integracoes/ia-propostas", icon: Sparkles },
    ],
  },
];

export default function ConfiguracoesLayout() {
  const { isAdmin, loading } = useAuth();
  const { pathname } = useLocation();

  const activeSection = useMemo(
    () => SECTIONS.find((s) => s.tabs.some((t) => pathname.startsWith(t.path))) ?? SECTIONS[0],
    [pathname],
  );

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-card/40 p-8 text-center">
        <Lock className="mx-auto mb-3 h-6 w-6 text-warning" />
        <h2 className="text-base font-semibold">Acesso restrito</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          As Configurações Gerais controlam variáveis usadas em todo o sistema e estão disponíveis somente para administradores.
        </p>
      </div>
    );
  }

  // Se cair na raiz /configuracoes, leva para a primeira aba.
  if (pathname === "/configuracoes" || pathname === "/configuracoes/") {
    return <Navigate to="/configuracoes/crm/etapas" replace />;
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-4 px-1 pb-12 animate-fade-in sm:space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-accent" />
          <h1 className="text-xl font-bold font-display tracking-tight sm:text-2xl">Configurações Gerais</h1>
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Centro único para catálogos compartilhados entre CRM, Projetos, Financeiro e Administração.
        </p>
      </header>

      {/* Section tabs (top-level) */}
      <nav className="flex gap-1 overflow-x-auto whitespace-nowrap border-b border-border">
        {SECTIONS.map((s) => {
          const isActive = s.key === activeSection.key;
          return (
            <NavLink
              key={s.key}
              to={s.tabs[0].path}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
                isActive
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Sub-tabs (within section) */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card/30 p-1">
        {activeSection.tabs.map((t) => (
          <NavLink
            key={t.key}
            to={t.path}
            className={({ isActive }) =>
              cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )
            }
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </NavLink>
        ))}
      </div>

      <div>
        <Outlet />
      </div>
    </div>
  );
}
