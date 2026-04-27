import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Search, Moon, Sun, LogOut, User as UserIcon, Shield, Eye } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
import { supabase } from "@/integrations/supabase/client";

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
  "/perfil": "Meu Perfil",
  "/admin/usuarios": "Admin › Usuários",
  "/admin/permissoes": "Admin › Permissões",
  "/admin/agencia": "Admin › Agência",
  "/admin/logs": "Admin › Logs",
};

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data ?? null));
  }, [user?.id]);

  // dynamic breadcrumb (handles /admin/usuarios/:id, etc.)
  const path = location.pathname;
  const breadcrumb =
    routeNames[path] ||
    (path.startsWith("/admin/usuarios/") ? "Admin › Usuário" :
     path.startsWith("/admin") ? "Admin" : "Página");

  const initials = (profile?.full_name || user?.email || "GB").substring(0, 2).toUpperCase();
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <header className="h-14 border-b bg-card flex items-center px-2 sm:px-4 gap-1 sm:gap-2 md:gap-4 sticky top-0 z-10">
      <SidebarTrigger className="h-10 w-10 shrink-0" />
      <span className="text-xs sm:text-sm text-muted-foreground font-medium truncate min-w-0">
        {breadcrumb}
      </span>
      <div className="flex-1" />

      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar..." className="pl-9 w-64 h-9 bg-muted/50" />
      </div>

      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden h-10 w-10" aria-label="Buscar">
            <Search className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="top" className="h-auto">
          <SheetHeader><SheetTitle>Buscar</SheetTitle></SheetHeader>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input autoFocus placeholder="Buscar..." className="pl-9 h-11 bg-muted/50" />
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
          <Button variant="ghost" className="rounded-full h-10 gap-2 px-1.5 sm:px-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:inline text-sm font-medium max-w-[160px] truncate">
              {displayName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="text-sm font-semibold truncate">{displayName}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/perfil")}>
            <UserIcon className="h-4 w-4 mr-2" /> Meu Perfil
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem onClick={() => navigate("/admin/usuarios")}>
              <Shield className="h-4 w-4 mr-2" /> Admin
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Eye className="h-4 w-4 mr-2" /> Ver como…
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled>Administrador (atual)</DropdownMenuItem>
                <DropdownMenuItem disabled>Gerente</DropdownMenuItem>
                <DropdownMenuItem disabled>Agente de Vendas</DropdownMenuItem>
                <DropdownMenuItem disabled>Operações</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem onClick={() => setDark(!dark)} className="sm:hidden">
            {dark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {dark ? "Tema claro" : "Tema escuro"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
