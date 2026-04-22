import { useLocation } from "react-router-dom";
import {
  Home,
  DollarSign,
  FolderKanban,
  Users,
  Settings,
  Code2,
  Eye,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  PieChart,
  FileText,
  ChevronUp,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import logo from "@/assets/logo-getbrain.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const mainItems = [
  { title: "Dashboard", url: "/", icon: Home },
];

const financeiroItems = [
  { title: "Dashboard", url: "/financeiro" },
  { title: "Contas a Pagar / Receber", url: "/financeiro/movimentacoes" },
  
  { title: "Orçamento", url: "/financeiro/orcamento" },
  { title: "Relatórios", url: "/financeiro/relatorios" },
  { title: "Extratos Bancários", url: "/financeiro/extratos" },
  { title: "Configurações", url: "/financeiro/configuracoes" },
];

const otherItems = [
  { title: "Projetos", url: "/projetos", icon: FolderKanban },
  { title: "Área Dev", url: "/area-dev", icon: Code2 },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [finOpen, setFinOpen] = useState(location.pathname.startsWith("/financeiro") || location.pathname === "/");

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname === path;

  const isFinActive = location.pathname.startsWith("/financeiro");

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="GetBrain" className={collapsed ? "h-6" : "h-8"} />
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-1">
        <SidebarGroup className="px-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors border-l-2 ${
                        active
                          ? "bg-sidebar-accent text-accent border-accent"
                          : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }`}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-2">
          <Collapsible open={finOpen} onOpenChange={setFinOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md font-medium text-sm transition-colors border-l-2 ${
                  isFinActive
                    ? "bg-sidebar-accent text-accent border-accent"
                    : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="h-[18px] w-[18px]" />
                  {!collapsed && <span>Financeiro</span>}
                </div>
                {!collapsed && (
                  <ChevronUp
                    className={`h-4 w-4 transition-transform duration-200 opacity-60 ${finOpen ? "" : "rotate-180"}`}
                  />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-0.5 space-y-0.5 py-0.5">
                {financeiroItems.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    className={`block px-4 py-1.5 ml-4 text-sm rounded-md transition-colors ${
                      isActive(item.url)
                        ? "text-accent font-medium"
                        : "text-sidebar-foreground/55 hover:text-sidebar-foreground"
                    }`}
                  >
                    {item.title}
                  </NavLink>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup className="px-2">
          <div className="space-y-0.5">
            {otherItems.map((item) => {
              const active = isActive(item.url);
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors border-l-2 ${
                    active
                      ? "bg-sidebar-accent text-accent border-accent"
                      : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              );
            })}
          </div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
