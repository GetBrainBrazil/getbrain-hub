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
  ChevronDown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import logo from "@/assets/logo-getbrain.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const mainItems = [
  { title: "Dashboard", url: "/", icon: Home },
];

const financeiroItems = [
  { title: "Visão Geral", url: "/financeiro", icon: Eye },
  { title: "Contas a Receber", url: "/financeiro/receber", icon: ArrowDownToLine },
  { title: "Contas a Pagar", url: "/financeiro/pagar", icon: ArrowUpFromLine },
  { title: "Transações", url: "/financeiro/transacoes", icon: ArrowLeftRight },
  { title: "Orçamento", url: "/financeiro/orcamento", icon: PieChart },
  { title: "Relatórios", url: "/financeiro/relatorios", icon: FileText },
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
  const [finOpen, setFinOpen] = useState(location.pathname.startsWith("/financeiro"));

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname === path;

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

        <SidebarGroup>
          <Collapsible open={finOpen} onOpenChange={setFinOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors">
                <DollarSign className="h-4 w-4 mr-2" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Financeiro</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${finOpen ? "rotate-180" : ""}`} />
                  </>
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {financeiroItems.map((item) => (
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
