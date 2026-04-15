import { useLocation } from "react-router-dom";
import {
  Home,
  DollarSign,
  FolderOpen,
  Users,
  Settings,
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
  { title: "Configurações", url: "/financeiro/configuracoes" },
];

const otherItems = [
  { title: "Projetos", url: "/projetos", icon: FolderOpen },
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
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-2">
          <Collapsible open={finOpen} onOpenChange={setFinOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  isFinActive
                    ? "bg-accent text-primary-foreground shadow-md shadow-accent/25"
                    : "bg-accent/15 text-accent hover:bg-accent/25"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="h-5 w-5" />
                  {!collapsed && <span>Financeiro</span>}
                </div>
                {!collapsed && (
                  <ChevronUp
                    className={`h-4 w-4 transition-transform duration-200 ${finOpen ? "" : "rotate-180"}`}
                  />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-0.5 py-1">
                {financeiroItems.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    className={`block px-4 py-2 text-sm rounded-md transition-colors ${
                      isActive(item.url)
                        ? "bg-accent/20 text-accent font-medium"
                        : "text-sidebar-foreground/60 hover:text-accent hover:bg-accent/10"
                    }`}
                  >
                    {item.title}
                  </NavLink>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
