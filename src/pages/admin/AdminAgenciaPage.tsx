import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgencia, useSaveAgencia } from "@/hooks/useAgencia";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logAction } from "@/hooks/useLogAction";

export default function AdminAgenciaPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading } = useAgencia();
  const save = useSaveAgencia();
  const [form, setForm] = useState({
    razao_social: "", nome_fantasia: "", cnpj: "", iata: "", email: "", telefone: "",
    endereco: "", cidade: "", estado: "", cep: "",
  });

  useEffect(() => {
    if (data) setForm({
      razao_social: data.razao_social ?? "", nome_fantasia: data.nome_fantasia ?? "",
      cnpj: data.cnpj ?? "", iata: data.iata ?? "",
      email: data.email ?? "", telefone: data.telefone ?? "",
      endereco: data.endereco ?? "", cidade: data.cidade ?? "",
      estado: data.estado ?? "", cep: data.cep ?? "",
    });
  }, [data]);

  async function handleSave() {
    if (!data) return;
    try {
      await save.mutateAsync({ id: data.id, ...form });
      await logAction({ acao: "update", modulo: "Agência", tabela: "tenant_settings", registro_id: data.id, resumo: "Dados da agência atualizados" });
      toast.success("Dados salvos");
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  }

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Card className="p-5 sm:p-6 space-y-5 max-w-3xl">
      <div>
        <div className="font-semibold">Dados da Agência</div>
        <p className="text-sm text-muted-foreground">Informações exibidas em propostas, e-mails e relatórios.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">Razão Social</Label><Input value={form.razao_social} onChange={set("razao_social")} disabled={!isAdmin} /></div>
        <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={set("nome_fantasia")} disabled={!isAdmin} /></div>
        <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">CNPJ</Label><Input value={form.cnpj} onChange={set("cnpj")} disabled={!isAdmin} /></div>
        <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">IATA</Label><Input value={form.iata} onChange={set("iata")} disabled={!isAdmin} /></div>
        <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">E-mail</Label><Input value={form.email} onChange={set("email")} disabled={!isAdmin} /></div>
        <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">Telefone</Label><Input value={form.telefone} onChange={set("telefone")} disabled={!isAdmin} /></div>
      </div>
      <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-[1fr_2fr_120px] gap-3">
        <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">CEP</Label><Input value={form.cep} onChange={set("cep")} disabled={!isAdmin} /></div>
        <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">Endereço</Label><Input value={form.endereco} onChange={set("endereco")} disabled={!isAdmin} /></div>
        <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">Estado</Label><Input value={form.estado} onChange={set("estado")} disabled={!isAdmin} /></div>
      </div>
      <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">Cidade</Label><Input value={form.cidade} onChange={set("cidade")} disabled={!isAdmin} /></div>
      <div className="flex justify-end pt-3 border-t">
        <Button onClick={handleSave} disabled={!isAdmin || save.isPending} className="gap-2 w-full sm:w-auto">
          <Save className="h-4 w-4" /> Salvar Alterações
        </Button>
      </div>
    </Card>
  );
}
