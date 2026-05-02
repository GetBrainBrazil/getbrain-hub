import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  DollarSign,
  FolderKanban,
  Code2,
  Handshake,
  Settings,
  ChevronDown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import logo from "@/assets/logo-getbrain.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type NavChild = { title: string; url: string };
type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChild[];
};

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  {
    title: "CRM",
    url: "/crm",
    icon: Handshake,
    children: [
      { title: "Dashboard", url: "/crm/dashboard" },
      { title: "Pipeline", url: "/crm/pipeline" },
      { title: "Leads & Empresas", url: "/crm/leads" },
      { title: "Clientes", url: "/clientes" },
      { title: "Calendário", url: "/crm/calendario" },
    ],
  },
  { title: "Projetos", url: "/projetos", icon: FolderKanban },
  {
    title: "Financeiro",
    url: "/financeiro",
    icon: DollarSign,
    children: [
      { title: "Dashboard", url: "/financeiro" },
      { title: "Contas a Pagar / Receber", url: "/financeiro/movimentacoes" },
      { title: "Recorrências", url: "/financeiro/recorrencias" },
      { title: "Contratos", url: "/financeiro/contratos" },
      { title: "Propostas", url: "/financeiro/orcamentos" },
      { title: "Relatórios", url: "/financeiro/relatorios" },
      { title: "Extratos Bancários", url: "/financeiro/extratos" },
    ],
  },
  {
    title: "Área Dev",
    url: "/dev",
    icon: Code2,
    children: [
      { title: "Dashboard", url: "/dev/dashboard" },
      { title: "Kanban", url: "/dev/kanban" },
      { title: "Sprints", url: "/dev/sprints" },
      { title: "Backlog", url: "/dev/backlog" },
    ],
  },
  {
    title: "Configurações",
    url: "/configuracoes",
    icon: Settings,
    children: [
      { title: "CRM", url: "/configuracoes/crm/etapas" },
      { title: "Projetos", url: "/configuracoes/projetos/tipos" },
      { title: "Financeiro", url: "/configuracoes/financeiro/contas" },
      { title: "Pessoas & Empresas", url: "/configuracoes/pessoas/setores" },
      { title: "Sistema", url: "/configuracoes/sistema/usuarios" },
      { title: "Integrações", url: "/configuracoes/integracoes/ia-propostas" },
    ],
  },
];

// Row used both expanded and collapsed. When collapsed: centered icon only.
const itemClasses = (active: boolean, collapsed: boolean) =>
  cn(
    "w-full flex items-center rounded-lg text-sm font-medium transition-colors border-l-2",
    "min-h-11",
    collapsed
      ? "justify-center px-0 py-2.5 border-transparent"
      : "gap-3 px-3 py-2.5 border-l-2",
    active
      ? collapsed
        ? "bg-sidebar-accent text-accent"
        : "bg-sidebar-accent text-accent border-accent"
      : cn(
          "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
          collapsed ? "" : "border-transparent"
        )
  );

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const isPathInside = (url: string) => {
    const path = location.pathname;
    if (path === url) return true;
    return path.startsWith(url + "/");
  };

  const isExactActive = (url: string) =>
    url === "/dashboard"
      ? location.pathname === "/dashboard" || location.pathname === "/"
      : location.pathname === url;

  const getActiveChild = (item: NavItem) => {
    if (!item.children) return undefined;
    const matches = item.children.filter((c) => isPathInside(c.url));
    if (matches.length === 0) return undefined;
    return matches.reduce((a, b) => (b.url.length > a.url.length ? b : a));
  };

  const isGroupOpen = (item: NavItem) =>
    !!item.children && isPathInside(item.url);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    navItems.forEach((i) => {
      if (i.children) map[i.title] = isPathInside(i.url);
    });
    return map;
  });

  useEffect(() => {
    const next: Record<string, boolean> = {};
    navItems.forEach((i) => {
      if (i.children) {
        next[i.title] = isPathInside(i.url);
      }
    });
    setOpenMap(next);
  }, [location.pathname]);

  // Wrap row in tooltip when collapsed for discoverability
  const withTooltip = (label: string, node: React.ReactNode) => {
    if (!collapsed) return node;
    return (
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>{node as any}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/40">
      <SidebarHeader className={cn("px-3 pt-4 pb-2", collapsed && "px-0 flex items-center justify-center")}>
        <div className="flex items-center gap-2">
          <img
            src={logo}
            alt="GetBrain"
            className={collapsed ? "h-7" : "h-8"}
          />
        </div>
      </SidebarHeader>
      <SidebarContent className={cn("pt-2", collapsed ? "px-1" : "px-2")}>
        <TooltipProvider disableHoverableContent>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const hasChildren = !!item.children?.length;
              const open = openMap[item.title] ?? false;

              // Leaf
              if (!hasChildren) {
                const active =
                  item.url === "/dashboard"
                    ? isExactActive(item.url)
                    : isPathInside(item.url);
                const node = (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    end={item.url === "/"}
                    className={itemClasses(active, collapsed)}
                    aria-label={item.title}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && (
                      <span className="truncate">{item.title}</span>
                    )}
                  </NavLink>
                );
                return (
                  <div key={item.title}>{withTooltip(item.title, node)}</div>
                );
              }

              // Parent w/ children
              const activeChild = getActiveChild(item);
              const parentActive = isGroupOpen(item);

              // Collapsed: render as a simple icon button that navigates to item.url
              if (collapsed) {
                const node = (
                  <button
                    type="button"
                    onClick={() => navigate(item.url)}
                    className={itemClasses(parentActive, true)}
                    aria-label={item.title}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                  </button>
                );
                return (
                  <div key={item.title}>{withTooltip(item.title, node)}</div>
                );
              }

              // Expanded: parent row + collapsible children
              return (
                <Collapsible
                  key={item.title}
                  open={open}
                  onOpenChange={(v) =>
                    setOpenMap((m) => ({ ...m, [item.title]: v }))
                  }
                >
                  <div
                    className={cn(itemClasses(parentActive, false), "pr-1 cursor-pointer")}
                    onClick={() => {
                      navigate(item.url);
                      setOpenMap((m) => ({ ...m, [item.title]: true }));
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(item.url);
                        setOpenMap((m) => ({ ...m, [item.title]: true }));
                      }
                    }}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate flex-1">{item.title}</span>
                    <button
                      type="button"
                      aria-label={open ? "Recolher" : "Expandir"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMap((m) => ({ ...m, [item.title]: !open }));
                      }}
                      className="p-1 rounded hover:bg-sidebar-accent/60 opacity-60 hover:opacity-100 transition"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          open ? "" : "-rotate-90"
                        )}
                      />
                    </button>
                  </div>

                  <CollapsibleContent>
                    <div className="mt-1 mb-1 ml-[1.6rem] pl-3 border-l border-sidebar-border/40 space-y-0.5">
                      {item.children!.map((sub) => {
                        const subActive = activeChild?.url === sub.url;
                        return (
                          <NavLink
                            key={sub.title}
                            to={sub.url}
                            end
                            className={cn(
                              "block px-3 py-2 min-h-9 rounded-md text-sm transition-colors flex items-center",
                              subActive
                                ? "text-accent font-medium bg-sidebar-accent/40"
                                : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                            )}
                          >
                            {sub.title}
                          </NavLink>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </nav>
        </TooltipProvider>
      </SidebarContent>
    </Sidebar>
  );
}
