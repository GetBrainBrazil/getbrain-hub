import { useEffect, useState } from "react";
import { Plus, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo_pessoa: "PJ", cpf_cnpj: "", email: "", telefone: "", endereco: "", observacoes: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("clientes").select("*").order("nome");
    setClientes(data || []);
  }

  async function handleSave() {
    const { error } = await supabase.from("clientes").insert({
      nome: form.nome,
      tipo_pessoa: form.tipo_pessoa,
      cpf_cnpj: form.cpf_cnpj || null,
      email: form.email || null,
      telefone: form.telefone || null,
      endereco: form.endereco || null,
      observacoes: form.observacoes || null,
    });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Cliente criado!");
    setOpen(false);
    setForm({ nome: "", tipo_pessoa: "PJ", cpf_cnpj: "", email: "", telefone: "", endereco: "", observacoes: "" });
    load();
  }

  const filtered = clientes.filter(c => !search || c.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Clientes</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1 min-h-11 sm:min-h-9 w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome / Razão Social *</Label><Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo_pessoa} onValueChange={v => setForm({...form, tipo_pessoa: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                    <SelectItem value="PF">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{form.tipo_pessoa === "PJ" ? "CNPJ" : "CPF"}</Label><Input value={form.cpf_cnpj} onChange={e => setForm({...form, cpf_cnpj: e.target.value})} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} /></div>
              </div>
              <div><Label>Endereço</Label><Input value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})} /></div>
              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} /></div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar clientes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 sm:h-9" />
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente cadastrado</h3>
              <p className="text-muted-foreground">Adicione seu primeiro cliente.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell><Badge variant="outline">{c.tipo_pessoa}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.cpf_cnpj || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.telefone || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={c.ativo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>{c.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {filtered.map(c => (
                  <div key={c.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm line-clamp-2">{c.nome}</p>
                      <Badge variant="outline" className="shrink-0">{c.tipo_pessoa}</Badge>
                    </div>
                    {c.cpf_cnpj && <p className="text-xs text-muted-foreground mt-1">{c.cpf_cnpj}</p>}
                    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {c.email && <p className="truncate">📧 {c.email}</p>}
                      {c.telefone && <p>📞 {c.telefone}</p>}
                    </div>
                    <div className="mt-2">
                      <Badge variant="outline" className={c.ativo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
