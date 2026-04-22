import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PROJECT_TYPE_OPTIONS,
  GETBRAIN_ORG_ID,
  projectFormSchema,
  ProjectFormValues,
} from "@/lib/projetos-helpers";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientes: { id: string; label: string }[];
  onCreated: (projectId: string) => void;
}

export function NovoProjetoDialog({ open, onOpenChange, clientes, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema) as any,
    defaultValues: {
      name: "",
      company_id: "",
      project_type: "sistema_personalizado",
      contract_value: undefined,
      installments_count: undefined,
      start_date: "",
      estimated_delivery_date: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!open) form.reset();
  }, [open]);

  async function onSubmit(values: ProjectFormValues) {
    setSubmitting(true);
    try {
      // Resolver actor do usuário (humans.auth_user_id = auth.uid)
      const { data: userData } = await supabase.auth.getUser();
      let ownerActorId: string | null = null;
      if (userData.user) {
        const { data: human } = await supabase
          .from("humans")
          .select("actor_id")
          .eq("auth_user_id", userData.user.id)
          .maybeSingle();
        ownerActorId = (human as any)?.actor_id ?? null;
      }

      const insertPayload: any = {
        organization_id: GETBRAIN_ORG_ID,
        name: values.name,
        company_id: values.company_id,
        project_type: values.project_type,
        contract_value: values.contract_value ?? null,
        installments_count: values.installments_count ?? null,
        start_date: values.start_date || null,
        estimated_delivery_date: values.estimated_delivery_date || null,
        description: values.description || null,
        owner_actor_id: ownerActorId,
        created_by_actor_id: ownerActorId,
        updated_by_actor_id: ownerActorId,
      };

      const { data: created, error } = await supabase
        .from("projects")
        .insert(insertPayload)
        .select("id, code")
        .single();
      if (error) throw error;

      // Audit log (não bloqueia o sucesso se falhar)
      await supabase.from("audit_logs").insert({
        organization_id: GETBRAIN_ORG_ID,
        actor_id: ownerActorId,
        entity_type: "project",
        entity_id: created.id,
        action: "create",
        changes: { name: { before: null, after: values.name } },
        metadata: { code: created.code },
      } as any);

      toast.success(`Projeto ${created.code} criado!`);
      onOpenChange(false);
      onCreated(created.id);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar projeto");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Nome do Projeto *</Label>
            <Input {...form.register("name")} placeholder="Ex: Sistema de triagem de candidatos" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <Label>Cliente *</Label>
            <Select
              value={form.watch("company_id")}
              onValueChange={(v) => form.setValue("company_id", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => toast("Módulo CRM em breve")}
              className="text-xs text-accent hover:underline mt-1"
            >
              + Novo Cliente
            </button>
            {form.formState.errors.company_id && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.company_id.message}</p>
            )}
          </div>

          <div>
            <Label>Tipo de Projeto *</Label>
            <Select
              value={form.watch("project_type")}
              onValueChange={(v) => form.setValue("project_type", v as any, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor Contratado (R$)</Label>
              <Input type="number" step="0.01" {...form.register("contract_value")} />
            </div>
            <div>
              <Label>Nº de Parcelas</Label>
              <Input type="number" {...form.register("installments_count")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data de Início</Label>
              <Input type="date" {...form.register("start_date")} />
            </div>
            <div>
              <Label>Entrega Estimada</Label>
              <Input type="date" {...form.register("estimated_delivery_date")} />
              {form.formState.errors.estimated_delivery_date && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.estimated_delivery_date.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} {...form.register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Criando..." : "Criar Projeto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
