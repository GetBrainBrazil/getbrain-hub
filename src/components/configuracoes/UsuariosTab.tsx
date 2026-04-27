import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreVertical, Pencil, Trash2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { useUsuarios, useDeleteUsuario, Usuario } from "@/hooks/useUsuarios";
import { UsuarioDialog } from "./UsuarioDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export function UsuariosTab() {
  const { user } = useAuth();
  const { data: usuarios = [], isLoading } = useUsuarios();
  const deleteMut = useDeleteUsuario();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Usuario | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return usuarios.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.cargo_nome?.toLowerCase().includes(q)
    );
  }, [usuarios, search]);

  function openNew() { setEditing(null); setDialogOpen(true); }
  function openEdit(u: Usuario) { setEditing(u); setDialogOpen(true); }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      toast.success("Usuário excluído");
      setConfirmDelete(null);
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9 h-10" />
          </div>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto min-h-10 gap-1">
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Nenhum usuário encontrado</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={u.avatar_url ?? undefined} />
                            <AvatarFallback>{u.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{u.full_name}</div>
                            {u.id === user?.id && <Badge variant="outline" className="text-xs">Você</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{u.email}</div>
                        {u.telefone && <div className="text-xs text-muted-foreground">{u.telefone}</div>}
                      </TableCell>
                      <TableCell>
                        {u.cargo_nome ? (
                          <Badge style={{ background: u.cargo_cor ?? undefined, color: "#fff" }}>{u.cargo_nome}</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.ativo ? "default" : "secondary"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(u)}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setConfirmDelete(u)} className="text-destructive" disabled={u.id === user?.id}>
                              <Trash2 className="h-4 w-4 mr-2" />Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {filtered.map(u => (
                <div key={u.id} className="border rounded-lg p-3 flex items-start gap-3">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={u.avatar_url ?? undefined} />
                    <AvatarFallback>{u.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{u.full_name}</div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 -mr-2"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(u)}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setConfirmDelete(u)} className="text-destructive" disabled={u.id === user?.id}>
                            <Trash2 className="h-4 w-4 mr-2" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {u.email && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="h-3 w-3" />{u.email}</div>}
                    {u.telefone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{u.telefone}</div>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {u.cargo_nome && <Badge style={{ background: u.cargo_cor ?? undefined, color: "#fff" }} className="text-xs">{u.cargo_nome}</Badge>}
                      <Badge variant={u.ativo ? "default" : "secondary"} className="text-xs">{u.ativo ? "Ativo" : "Inativo"}</Badge>
                      {u.id === user?.id && <Badge variant="outline" className="text-xs">Você</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      <UsuarioDialog open={dialogOpen} onOpenChange={setDialogOpen} usuario={editing} />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Excluir usuário?"
        description={`Tem certeza que deseja excluir ${confirmDelete?.full_name}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        confirmLabel="Excluir"
        variant="destructive"
      />
    </Card>
  );
}
