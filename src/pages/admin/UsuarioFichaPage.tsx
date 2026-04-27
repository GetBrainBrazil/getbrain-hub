import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, KeyRound, FileText, MapPin, User as UserIcon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useUsuarioFicha, useUpdatePerfilCampos } from "@/hooks/useUsuarioFicha";
import { useCargos } from "@/hooks/useCargos";
import { useUpdateUsuario, useDeleteUsuario } from "@/hooks/useUsuarios";
import { useContratos, useDeleteContrato } from "@/hooks/useContratos";
import { UserHeaderCard } from "@/components/admin/UserHeaderCard";
import { DangerZoneCard } from "@/components/admin/DangerZoneCard";
import { NovoContratoDialog } from "@/components/admin/NovoContratoDialog";
import { lookupCep } from "@/lib/cep";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/hooks/useLogAction";

export default function UsuarioFichaPage({ mode }: { mode: "perfil" | "admin" }) {
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const { user: me, isAdmin } = useAuth();
  const userId = mode === "perfil" ? me?.id : paramId;
  const isSelf = userId === me?.id;
  const canEdit = mode === "admin" ? isAdmin : isSelf;
  const canEditRole = mode === "admin" && isAdmin && !isSelf;

  const { data: ficha, isLoading } = useUsuarioFicha(userId);
  const { data: cargos = [] } = useCargos();
  const updatePerfil = useUpdatePerfilCampos();
  const updateUser = useUpdateUsuario();
  const deleteUser = useDeleteUsuario();
  const [tab, setTab] = usePersistedState<string>(`ficha:${mode}:tab`, "dados");
  const [contratoOpen, setContratoOpen] = useState(false);

  // form state - dados
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cargoId, setCargoId] = useState("");
  // endereco
  const [cep, setCep] = useState("");
  const [pais, setPais] = useState("Brasil");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [emerNome, setEmerNome] = useState("");
  const [emerTel, setEmerTel] = useState("");
  const [planoSaude, setPlanoSaude] = useState("");
  // senha
  const [senha1, setSenha1] = useState("");
  const [senha2, setSenha2] = useState("");

  useEffect(() => {
    if (ficha) {
      setFullName(ficha.full_name);
      setEmail(ficha.email ?? "");
      setTelefone(ficha.telefone ?? "");
      setCargoId(ficha.cargo_id ?? "");
      setCep(ficha.cep ?? "");
      setPais(ficha.pais ?? "Brasil");
      setEndereco(ficha.endereco ?? "");
      setNumero(ficha.numero ?? "");
      setComplemento(ficha.complemento ?? "");
      setBairro(ficha.bairro ?? "");
      setCidade(ficha.cidade ?? "");
      setEstado(ficha.estado ?? "");
      setEmerNome(ficha.contato_emergencia_nome ?? "");
      setEmerTel(ficha.contato_emergencia_telefone ?? "");
      setPlanoSaude(ficha.plano_saude ?? "");
    }
  }, [ficha]);

  async function handleCepBlur() {
    const r = await lookupCep(cep);
    if (r) {
      setEndereco(r.logradouro || endereco);
      setBairro(r.bairro || bairro);
      setCidade(r.localidade || cidade);
      setEstado(r.uf || estado);
    }
  }

  async function saveDados() {
    if (!userId) return;
    try {
      if (mode === "admin" && isAdmin) {
        await updateUser.mutateAsync({
          user_id: userId, full_name: fullName,
          email: email !== ficha?.email ? email : undefined,
          telefone, cargo_id: canEditRole ? (cargoId || null) : undefined,
        });
      } else {
        await updatePerfil.mutateAsync({ id: userId, patch: { full_name: fullName, telefone } });
      }
      await logAction({ acao: "update", modulo: "Usuários", tabela: "profiles", registro_id: userId, resumo: `Dados pessoais atualizados (${fullName})` });
      toast.success("Alterações salvas");
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  }

  async function saveEndereco() {
    if (!userId) return;
    try {
      await updatePerfil.mutateAsync({ id: userId, patch: {
        cep, pais, endereco, numero, complemento, bairro, cidade, estado,
        contato_emergencia_nome: emerNome, contato_emergencia_telefone: emerTel, plano_saude: planoSaude,
      } });
      await logAction({ acao: "update", modulo: "Usuários", tabela: "profiles", registro_id: userId, resumo: `Endereço/emergência atualizados` });
      toast.success("Endereço salvo");
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  }

  async function alterarSenha() {
    if (!userId) return;
    if (senha1 !== senha2) return toast.error("As senhas não conferem");
    if (senha1.length < 6) return toast.error("Mínimo 6 caracteres");
    try {
      if (isSelf) {
        const { error } = await supabase.auth.updateUser({ password: senha1 });
        if (error) throw error;
      } else {
        await updateUser.mutateAsync({ user_id: userId, password: senha1 });
      }
      await logAction({ acao: "password_change", modulo: "Auth", tabela: "auth.users", registro_id: userId, resumo: `Senha alterada` });
      toast.success("Senha alterada");
      setSenha1(""); setSenha2("");
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  }

  async function handleDelete() {
    if (!userId) return;
    try {
      await deleteUser.mutateAsync(userId);
      await logAction({ acao: "delete", modulo: "Usuários", tabela: "auth.users", registro_id: userId, resumo: `Usuário excluído (${fullName})` });
      toast.success("Usuário excluído");
      navigate("/admin/usuarios");
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  }

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (!ficha) return <div className="p-8 text-center text-sm text-muted-foreground">Usuário não encontrado</div>;

  const breadcrumbBack = mode === "admin" ? "/admin/usuarios" : "/";

  return (
    <div className="space-y-5">
      {mode === "admin" && (
        <div className="text-xs text-muted-foreground">
          <button onClick={() => navigate("/admin/usuarios")} className="hover:underline">Admin</button>
          {" / "}
          <button onClick={() => navigate("/admin/usuarios")} className="hover:underline">Usuários</button>
          {" / "}<span className="text-foreground">{ficha.full_name}</span>
        </div>
      )}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(breadcrumbBack)} className="h-10 w-10 -ml-2 mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-serif text-2xl sm:text-4xl tracking-tight">{ficha.full_name}</h1>
      </div>

      <UserHeaderCard
        userId={ficha.id}
        fullName={ficha.full_name}
        email={ficha.email}
        avatarUrl={ficha.avatar_url}
        cargoNome={ficha.cargo_nome}
        cargoCor={ficha.cargo_cor}
        canUpload={canEdit}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto bg-muted/40 h-auto p-1">
          <TabsTrigger value="dados" className="gap-2 min-h-10"><UserIcon className="h-4 w-4" />Dados Pessoais</TabsTrigger>
          <TabsTrigger value="endereco" className="gap-2 min-h-10"><MapPin className="h-4 w-4" />Endereço & Emergência</TabsTrigger>
          <TabsTrigger value="contratos" className="gap-2 min-h-10"><FileText className="h-4 w-4" />Contratos</TabsTrigger>
          <TabsTrigger value="senha" className="gap-2 min-h-10"><KeyRound className="h-4 w-4" />Senha</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          <Card className="p-5 sm:p-6 space-y-5">
            <div>
              <div className="font-semibold">Informações de identificação</div>
              <p className="text-sm text-muted-foreground">Dados básicos para acesso e contato.</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nome completo</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} disabled={!canEdit} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">E-mail</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!canEditRole && !isAdmin} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Celular</Label>
                <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" disabled={!canEdit} />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Função</Label>
              <Select value={cargoId || "none"} onValueChange={v => setCargoId(v === "none" ? "" : v)} disabled={!canEditRole}>
                <SelectTrigger><SelectValue placeholder="Sem cargo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cargo</SelectItem>
                  {cargos.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: c.cor }} />{c.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => navigate(breadcrumbBack)}>Cancelar</Button>
              <Button onClick={saveDados} disabled={!canEdit || updatePerfil.isPending} className="gap-2">
                <Save className="h-4 w-4" /> Salvar Alterações
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="endereco" className="mt-4">
          <Card className="p-5 sm:p-6 space-y-5">
            <div>
              <div className="font-semibold">Endereço</div>
              <p className="text-sm text-muted-foreground">Informe o CEP para preenchimento automático.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">CEP</Label>
                <Input value={cep} onChange={e => setCep(e.target.value)} onBlur={handleCepBlur} placeholder="00000-000" disabled={!canEdit} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">País</Label>
                <Input value={pais} onChange={e => setPais(e.target.value)} disabled={!canEdit} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Endereço</Label>
                <Input value={endereco} onChange={e => setEndereco(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Número</Label>
                <Input value={numero} onChange={e => setNumero(e.target.value)} disabled={!canEdit} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Complemento</Label>
                <Input value={complemento} onChange={e => setComplemento(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Bairro</Label>
                <Input value={bairro} onChange={e => setBairro(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cidade</Label>
                <Input value={cidade} onChange={e => setCidade(e.target.value)} disabled={!canEdit} />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Estado</Label>
              <Input value={estado} onChange={e => setEstado(e.target.value)} disabled={!canEdit} />
            </div>

            <div className="border-t pt-5">
              <div className="font-semibold">Contato de Emergência</div>
              <p className="text-sm text-muted-foreground">Pessoa a ser acionada em caso de necessidade.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nome</Label>
                <Input value={emerNome} onChange={e => setEmerNome(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Telefone</Label>
                <Input value={emerTel} onChange={e => setEmerTel(e.target.value)} placeholder="(11) 99999-9999" disabled={!canEdit} />
              </div>
            </div>
            <div className="border-t pt-5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Plano de Saúde</Label>
              <Input value={planoSaude} onChange={e => setPlanoSaude(e.target.value)} placeholder="Ex: Unimed, SulAmérica" disabled={!canEdit} />
            </div>
            <div className="flex justify-end pt-2 border-t">
              <Button onClick={saveEndereco} disabled={!canEdit || updatePerfil.isPending} className="gap-2 w-full sm:w-auto">
                <Save className="h-4 w-4" /> Salvar Alterações
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="contratos" className="mt-4">
          <ContratosCard userId={userId!} canEdit={isAdmin} onNew={() => setContratoOpen(true)} />
          <NovoContratoDialog open={contratoOpen} onOpenChange={setContratoOpen} userId={userId!} />
        </TabsContent>

        <TabsContent value="senha" className="mt-4">
          <Card className="p-5 sm:p-6 max-w-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-semibold">Alterar senha</div>
                <div className="text-sm text-muted-foreground">Definindo nova senha para <strong>{ficha.email}</strong></div>
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nova senha</Label>
              <Input type="password" value={senha1} onChange={e => setSenha1(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Confirmar nova senha</Label>
              <Input type="password" value={senha2} onChange={e => setSenha2(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={alterarSenha} className="gap-2"><KeyRound className="h-4 w-4" />Alterar Senha</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {mode === "admin" && isAdmin && !isSelf && (
        <DangerZoneCard onDelete={handleDelete} fullName={ficha.full_name} />
      )}
    </div>
  );
}

function ContratosCard({ userId, canEdit, onNew }: { userId: string; canEdit: boolean; onNew: () => void }) {
  const { data: contratos = [], isLoading } = useContratos(userId);
  const del = useDeleteContrato();
  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="font-semibold">Contratos de Trabalho</div>
          <p className="text-sm text-muted-foreground">Histórico de vínculos com a empresa.</p>
        </div>
        {canEdit && (
          <Button onClick={onNew} className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" />Novo Contrato</Button>
        )}
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : contratos.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum contrato cadastrado.</div>
      ) : (
        <div className="space-y-2">
          {contratos.map(c => (
            <div key={c.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{c.tipo}{c.cargo ? ` — ${c.cargo}` : ""}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(c.data_inicio).toLocaleDateString("pt-BR")}
                  {c.data_fim && ` → ${new Date(c.data_fim).toLocaleDateString("pt-BR")}`}
                  {c.salario != null && ` · R$ ${c.salario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                </div>
              </div>
              {canEdit && (
                <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: c.id, user_id: userId })} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
