import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useUsuarios } from "@/hooks/useUsuarios";
import { UsuarioDialog } from "@/components/configuracoes/UsuarioDialog";

export default function AdminUsuariosList() {
  const navigate = useNavigate();
  const { data: usuarios = [], isLoading } = useUsuarios();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return usuarios.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.cargo_nome?.toLowerCase().includes(q)
    );
  }, [usuarios, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button onClick={() => setDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-10 gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuário…" className="pl-9 h-10" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum usuário encontrado</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[80px_1.5fr_2fr_1fr_1fr] px-6 py-3 text-xs font-medium text-muted-foreground border-b">
                <div>Foto</div><div>Nome</div><div>E-mail</div><div>Celular</div><div>Função</div>
              </div>
              {filtered.map(u => (
                <button
                  key={u.id}
                  onClick={() => navigate(`/admin/usuarios/${u.id}`)}
                  className="grid grid-cols-[80px_1.5fr_2fr_1fr_1fr] px-6 py-3 items-center w-full text-left hover:bg-muted/40 border-b last:border-b-0 transition-colors"
                >
                  <div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={u.avatar_url ?? undefined} />
                      <AvatarFallback>{u.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="font-medium truncate">{u.full_name}</div>
                  <div className="text-sm text-muted-foreground truncate">{u.email ?? "—"}</div>
                  <div className="text-sm text-muted-foreground">{u.telefone ?? "—"}</div>
                  <div>
                    {u.cargo_nome ? (
                      <Badge style={{ background: u.cargo_cor ?? undefined, color: "#fff" }} className="rounded-full">
                        {u.cargo_nome}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {/* Mobile */}
            <div className="md:hidden divide-y">
              {filtered.map(u => (
                <button
                  key={u.id}
                  onClick={() => navigate(`/admin/usuarios/${u.id}`)}
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/40"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={u.avatar_url ?? undefined} />
                    <AvatarFallback>{u.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{u.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    {u.cargo_nome && (
                      <Badge style={{ background: u.cargo_cor ?? undefined, color: "#fff" }} className="text-xs mt-1 rounded-full">
                        {u.cargo_nome}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </Card>

      <UsuarioDialog open={dialogOpen} onOpenChange={setDialogOpen} usuario={null} />
    </div>
  );
}
