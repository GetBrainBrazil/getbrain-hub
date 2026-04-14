import { useLocation } from "react-router-dom";
import { Bell, Search, Moon, Sun, LogOut, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

const routeNames: Record<string, string> = {
  "/": "Dashboard",
  "/financeiro": "Financeiro › Dashboard",
  "/financeiro/receber": "Financeiro › Contas a Receber",
  "/financeiro/pagar": "Financeiro › Contas a Pagar",
  "/financeiro/transacoes": "Financeiro › Transações",
  "/financeiro/orcamento": "Financeiro › Orçamento",
  "/financeiro/relatorios": "Financeiro › Relatórios",
  "/projetos": "Projetos",
  "/clientes": "Clientes",
  "/configuracoes": "Configurações",
};

export function TopBar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const breadcrumb = routeNames[location.pathname] || "Página";
  const initials = user?.email?.substring(0, 2).toUpperCase() || "GB";

  return (
    <header className="h-14 border-b bg-card flex items-center px-4 gap-4 sticky top-0 z-10">
      <SidebarTrigger />
      <span className="text-sm text-muted-foreground font-medium">{breadcrumb}</span>
      <div className="flex-1" />
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar..." className="pl-9 w-64 h-9 bg-muted/50" />
      </div>
      <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
        <Bell className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} aria-label="Alternar tema">
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-xs text-muted-foreground">{user?.email}</DropdownMenuItem>
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
