import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePersistedState } from "@/hooks/use-persisted-state";

export default function Configuracoes() {
  const [tab, setTab] = usePersistedState<string>("configuracoes:tab", "conta");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="conta">Minha Conta</TabsTrigger>
          <TabsTrigger value="meios">Meios de Pagamento</TabsTrigger>
        </TabsList>
        <TabsContent value="conta"><MinhaContaTab /></TabsContent>
        <TabsContent value="meios"><MeiosPagamentoTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function MinhaContaTab() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("full_name").eq("id", user.id).single().then(({ data }) => {
        if (data) setFullName(data.full_name);
      });
    }
  }, [user]);

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) { toast.error("As senhas não conferem"); return; }
    if (newPassword.length < 6) { toast.error("A senha deve ter no mínimo 6 caracteres"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Senha alterada com sucesso!"); setNewPassword(""); setConfirmPassword(""); }
  }

  async function handleUpdateName() {
    if (!fullName.trim()) return;
    setNameLoading(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user!.id);
    setNameLoading(false);
    if (error) toast.error("Erro ao atualizar nome");
    else toast.success("Nome atualizado!");
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>E-mail</Label><Input value={user?.email || ""} disabled className="bg-muted/50" /></div>
          <div><Label>Nome completo</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
          <Button onClick={handleUpdateName} disabled={nameLoading} size="sm">{nameLoading ? "Salvando..." : "Salvar Nome"}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Alterar Senha</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Nova senha</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
          <div><Label>Confirmar nova senha</Label><Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" /></div>
          <Button onClick={handleChangePassword} disabled={loading} size="sm">{loading ? "Alterando..." : "Alterar Senha"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MeiosPagamentoTab() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("meios_pagamento").select("*").order("nome"); setItems(data || []); }

  async function handleSave() {
    const { error } = await supabase.from("meios_pagamento").insert({ nome });
    if (error) { toast.error("Erro"); return; }
    toast.success("Criado!"); setOpen(false); setNome(""); load();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from("meios_pagamento").update({ ativo: !ativo }).eq("id", id); load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Meios de Pagamento</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Meio de Pagamento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Ativo</TableHead></TableRow></TableHeader>
          <TableBody>{items.map(i => (
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.nome}</TableCell>
              <TableCell><Switch checked={i.ativo} onCheckedChange={() => toggleAtivo(i.id, i.ativo)} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
