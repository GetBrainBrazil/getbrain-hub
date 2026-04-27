import { useLocation } from "react-router-dom";
import { Bell, Search, Moon, Sun, LogOut } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const breadcrumb = routeNames[location.pathname] || "Página";
  const initials = user?.email?.substring(0, 2).toUpperCase() || "GB";

  return (
    <header className="h-14 border-b bg-card flex items-center px-2 sm:px-4 gap-1 sm:gap-2 md:gap-4 sticky top-0 z-10">
      <SidebarTrigger className="h-10 w-10 shrink-0" />
      <span className="text-xs sm:text-sm text-muted-foreground font-medium truncate min-w-0">
        {breadcrumb}
      </span>
      <div className="flex-1" />

      {/* Desktop search */}
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar..." className="pl-9 w-64 h-9 bg-muted/50" />
      </div>

      {/* Mobile search trigger */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden h-10 w-10" aria-label="Buscar">
            <Search className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="top" className="h-auto">
          <SheetHeader>
            <SheetTitle>Buscar</SheetTitle>
          </SheetHeader>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar..."
              className="pl-9 h-11 bg-muted/50"
            />
          </div>
        </SheetContent>
      </Sheet>

      <Button variant="ghost" size="icon" className="relative h-10 w-10" aria-label="Notificações">
        <Bell className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDark(!dark)}
        aria-label="Alternar tema"
        className="hidden sm:inline-flex h-10 w-10"
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-xs text-muted-foreground">{user?.email}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDark(!dark)} className="sm:hidden">
            {dark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {dark ? "Tema claro" : "Tema escuro"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
