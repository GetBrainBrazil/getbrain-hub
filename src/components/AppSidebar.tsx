import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  DollarSign,
  FolderKanban,
  Users,
  Settings,
  Code2,
  Handshake,
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
  { title: "Dashboard", url: "/", icon: Home },
  {
    title: "Financeiro",
    url: "/financeiro",
    icon: DollarSign,
    children: [
      { title: "Dashboard", url: "/financeiro" },
      { title: "Vendas", url: "/financeiro/vendas" },
      { title: "Contas a Pagar / Receber", url: "/financeiro/movimentacoes" },
      { title: "Contratos", url: "/financeiro/contratos" },
      { title: "Orçamento", url: "/financeiro/orcamento" },
      { title: "Relatórios", url: "/financeiro/relatorios" },
      { title: "Extratos Bancários", url: "/financeiro/extratos" },
      { title: "Configurações", url: "/financeiro/configuracoes" },
    ],
  },
  { title: "Projetos", url: "/projetos", icon: FolderKanban },
  {
    title: "CRM",
    url: "/crm",
    icon: Handshake,
    children: [
      { title: "Dashboard", url: "/crm/dashboard" },
      { title: "Pipeline", url: "/crm/pipeline" },
      { title: "Leads", url: "/crm/leads" },
      { title: "Empresas", url: "/crm/empresas" },
      { title: "Calendário", url: "/crm/calendario" },
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
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

const itemClasses = (active: boolean) =>
  cn(
    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors border-l-2",
    active
      ? "bg-sidebar-accent text-accent border-accent"
      : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
  );

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const isExactActive = (url: string) =>
    url === "/" ? location.pathname === "/" : location.pathname === url;

  const isGroupOpen = (item: NavItem) =>
    !!item.children && location.pathname.startsWith(item.url);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    navItems.forEach((i) => {
      if (i.children) map[i.title] = location.pathname.startsWith(i.url);
    });
    return map;
  });

  useEffect(() => {
    const next: Record<string, boolean> = {};
    navItems.forEach((i) => {
      if (i.children) {
        next[i.title] = location.pathname.startsWith(i.url);
      }
    });
    setOpenMap(next);
  }, [location.pathname]);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="GetBrain" className={collapsed ? "h-6" : "h-8"} />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <nav className="px-2 space-y-1">
          {navItems.map((item) => {
            const hasChildren = !!item.children?.length;
            const open = openMap[item.title] ?? false;

            // Item without children: simple NavLink
            if (!hasChildren) {
              const active = isExactActive(item.url);
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  end={item.url === "/"}
                  className={itemClasses(active)}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </NavLink>
              );
            }

            // Item with children: parent navigates to first child / item.url, chevron toggles
            const activeChild = item.children!.find((c) => isExactActive(c.url));
            const parentActive = isGroupOpen(item) && !activeChild;

            return (
              <Collapsible
                key={item.title}
                open={collapsed ? false : open}
                onOpenChange={(v) =>
                  setOpenMap((m) => ({ ...m, [item.title]: v }))
                }
              >
                <div className={cn(itemClasses(parentActive), "pr-1 cursor-pointer")}
                  onClick={() => {
                    navigate(item.url);
                    if (!collapsed) setOpenMap((m) => ({ ...m, [item.title]: true }));
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(item.url);
                      if (!collapsed) setOpenMap((m) => ({ ...m, [item.title]: true }));
                    }
                  }}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && (
                    <>
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
                    </>
                  )}
                </div>

                {!collapsed && (
                  <CollapsibleContent>
                    <div className="mt-1 ml-[1.6rem] pl-3 border-l border-sidebar-border/40 space-y-0.5">
                      {item.children!.map((sub) => {
                        const subActive = isExactActive(sub.url);
                        return (
                          <NavLink
                            key={sub.title}
                            to={sub.url}
                            end
                            className={cn(
                              "block px-3 py-1.5 rounded-md text-sm transition-colors",
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
                )}
              </Collapsible>
            );
          })}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}
