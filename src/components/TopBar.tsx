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
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCargos } from "@/hooks/useCargos";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useViewAs } from "@/hooks/useViewAs";

const cnActive = (active: boolean) => active ? "font-semibold" : "font-medium";

const routeNames: Record<string, string> = {
  "/": "Dashboard",
  "/financeiro": "Financeiro › Dashboard",
  "/financeiro/receber": "Financeiro › Contas a Receber",
  "/financeiro/pagar": "Financeiro › Contas a Pagar",
  "/financeiro/transacoes": "Financeiro › Transações",
  "/financeiro/orcamento": "Financeiro › Proposta",
  "/financeiro/orcamentos": "Financeiro › Propostas",
  "/financeiro/relatorios": "Financeiro › Relatórios",
  "/projetos": "Projetos",
  "/clientes": "Clientes",
  "/perfil": "Meu Perfil",
  "/configuracoes": "Configurações",
  "/configuracoes/sistema/usuarios": "Configurações › Usuários",
  "/configuracoes/sistema/permissoes": "Configurações › Permissões",
  "/configuracoes/sistema/auditoria": "Configurações › Auditoria",
};

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [userSearch, setUserSearch] = useState("");

  const { data: cargos = [] } = useCargos();
  const { data: usuarios = [] } = useUsuarios();
  const { mode: viewAsMode, setViewAs } = useViewAs();

  const orderedCargos = useMemo(() => [...cargos].sort((a, b) => b.nivel - a.nivel), [cargos]);
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const list = q ? usuarios.filter(u => (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q)) : usuarios;
    return list.slice(0, 10);
  }, [usuarios, userSearch]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data ?? null));
  }, [user?.id]);

  // dynamic breadcrumb
  const path = location.pathname;
  const breadcrumb =
    routeNames[path] ||
    (path.startsWith("/admin/usuarios/") ? "Configurações › Usuário" :
     path.startsWith("/configuracoes") ? "Configurações" : "Página");

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
            <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
              <Shield className="h-4 w-4 mr-2" /> Configurações
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Eye className="h-4 w-4 mr-2" /> Ver como…
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-72 p-0 max-h-[80vh] overflow-y-auto">
                <div className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-widest text-muted-foreground">
                  POR FUNÇÃO
                </div>
                {orderedCargos.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum cargo cadastrado</div>
                )}
                {orderedCargos.map((c) => {
                  const active = viewAsMode.kind === "cargo" && viewAsMode.cargoId === c.id;
                  return (
                    <DropdownMenuItem
                      key={c.id}
                      onSelect={(e) => {
                        e.preventDefault();
                        setViewAs({ kind: "cargo", cargoId: c.id, cargoNome: c.nome, cargoCor: c.cor });
                      }}
                      className="flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.cor }} />
                      <span className={cnActive(active)}>{c.nome}</span>
                      {active && <span className="text-[10px] text-muted-foreground ml-auto">(atual)</span>}
                    </DropdownMenuItem>
                  );
                })}

                <DropdownMenuSeparator />

                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-widest text-muted-foreground">
                  POR USUÁRIO
                </div>
                <div className="px-2 pb-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Buscar usuário..."
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                </div>
                {filteredUsers.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum usuário encontrado</div>
                )}
                {filteredUsers.map((u) => {
                  const active = viewAsMode.kind === "user" && viewAsMode.userId === u.id;
                  return (
                    <DropdownMenuItem
                      key={u.id}
                      onSelect={(e) => {
                        e.preventDefault();
                        setViewAs({
                          kind: "user",
                          userId: u.id,
                          userNome: u.full_name,
                          cargoNome: u.cargo_nome ?? undefined,
                        });
                      }}
                    >
                      <span className="truncate flex-1">
                        <span className={cnActive(active)}>{u.full_name}</span>
                        {u.cargo_nome && <span className="text-muted-foreground"> — {u.cargo_nome}</span>}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
                {viewAsMode.kind !== "none" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(e) => { e.preventDefault(); setViewAs({ kind: "none" }); }}
                      className="text-destructive focus:text-destructive"
                    >
                      Sair de "Ver como…"
                    </DropdownMenuItem>
                  </>
                )}
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
