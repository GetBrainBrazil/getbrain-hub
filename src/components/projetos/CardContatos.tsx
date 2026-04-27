import { useMemo, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, Plus, Star, StarOff, Trash2, Pencil, Save, X, User, Briefcase, UserPlus, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPhoneBR } from "@/lib/formatters";
import {
  ProjectContact,
  useCreateProjectContact,
  useProjectContacts,
  useSetPrimaryContact,
  useUnlinkProjectContact,
  useUpdateProjectContact,
} from "@/hooks/projetos/useProjectContacts";
import { useConfirm } from "@/components/ConfirmDialog";

const contactSchema = z.object({
  full_name: z.string().trim().min(2, "Nome obrigatório").max(120),
  role_in_company: z.string().trim().max(80).optional().or(z.literal("")),
  email: z.string().trim().email("Email inválido").max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

type FormState = { full_name: string; role_in_company: string; email: string; phone: string };
const emptyForm: FormState = { full_name: "", role_in_company: "", email: "", phone: "" };

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function PhoneInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Input
      value={formatPhoneBR(value)}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      placeholder={placeholder ?? "(11) 99999-9999"}
    />
  );
}

function useExistingRoles() {
  return useQuery({
    queryKey: ["people-roles-distinct"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await (supabase as any)
        .from("people")
        .select("role_in_company")
        .not("role_in_company", "is", null)
        .is("deleted_at", null);
      if (error) throw error;
      return Array.from(
        new Set<string>((data ?? []).map((r: any) => String(r.role_in_company).trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
    staleTime: 60_000,
  });
}

function RoleCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: roles = [] } = useExistingRoles();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const normalized = search.trim();
  const filtered = useMemo(
    () => roles.filter((r) => r.toLowerCase().includes(normalized.toLowerCase())),
    [roles, normalized],
  );
  const exactMatch = filtered.some((r) => r.toLowerCase() === normalized.toLowerCase());

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Selecionar ou criar cargo…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar ou digitar novo cargo…" value={search} onValueChange={setSearch} />
          <CommandList>
            {filtered.length === 0 && !normalized && (
              <CommandEmpty>Nenhum cargo cadastrado ainda.</CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup heading="Cargos existentes">
                {filtered.map((r) => (
                  <CommandItem key={r} value={r} onSelect={() => select(r)}>
                    <Check className={cn("mr-2 h-4 w-4", value === r ? "opacity-100" : "opacity-0")} />
                    {r}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {normalized && !exactMatch && (
              <CommandGroup heading="Criar novo">
                <CommandItem value={`__new__${normalized}`} onSelect={() => select(normalized)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar "{normalized}"
                </CommandItem>
              </CommandGroup>
            )}
            {value && (
              <CommandGroup>
                <CommandItem value="__clear__" onSelect={() => select("")}>
                  <X className="mr-2 h-4 w-4" />
                  Limpar cargo
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ContactRow({
  contact,
  companyId,
  onEdit,
}: {
  contact: ProjectContact;
  companyId: string;
  onEdit: () => void;
}) {
  const setPrimary = useSetPrimaryContact();
  const unlink = useUnlinkProjectContact();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const handleUnlink = async () => {
    const ok = await confirm({
      title: "Remover contato do projeto?",
      description: `${contact.full_name} continuará existindo no CRM, mas não estará mais vinculado a esta empresa.`,
      confirmLabel: "Remover",
      variant: "destructive",
    });
    if (!ok) return;
    unlink.mutate(
      { company_id: companyId, link_id: contact.link_id },
      { onSuccess: () => toast.success("Contato removido") },
    );
  };

  const togglePrimary = () => {
    if (contact.is_primary_contact) return;
    setPrimary.mutate(
      { company_id: companyId, link_id: contact.link_id },
      { onSuccess: () => toast.success("Contato principal atualizado") },
    );
  };

  return (
    <div className="contents">
    {confirmDialog}
    <div className="group/contact flex items-start gap-3 rounded-md border border-transparent px-2 py-2.5 transition-colors hover:border-border/60 hover:bg-muted/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
        {initials(contact.full_name) || <User className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{contact.full_name}</span>
          {contact.is_primary_contact && (
            <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
              <Star className="h-2.5 w-2.5 fill-current" /> Principal
            </span>
          )}
          {contact.role_in_company && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="h-3 w-3" />
              {contact.role_in_company}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Mail className="h-3 w-3" />
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Phone className="h-3 w-3" />
              {formatPhoneBR(contact.phone)}
            </a>
          )}
          {!contact.email && !contact.phone && <span className="italic">Sem contato cadastrado</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/contact:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={togglePrimary} disabled={contact.is_primary_contact}>
              {contact.is_primary_contact ? <Star className="h-3.5 w-3.5 fill-current text-accent" /> : <StarOff className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{contact.is_primary_contact ? "Já é principal" : "Marcar como principal"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Editar</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleUnlink}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remover do projeto</TooltipContent>
        </Tooltip>
      </div>
    </div>
    </div>
  );
}

function ContactForm({
  initial,
  isPrimaryToggleable,
  initialIsPrimary,
  onCancel,
  onSubmit,
  submitting,
  submitLabel,
}: {
  initial?: FormState;
  isPrimaryToggleable?: boolean;
  initialIsPrimary?: boolean;
  onCancel: () => void;
  onSubmit: (form: FormState, isPrimary: boolean) => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<FormState>(initial ?? emptyForm);
  const [isPrimary, setIsPrimary] = useState(!!initialIsPrimary);

  const handle = () => {
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    onSubmit(form, isPrimary);
  };

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome *</Label>
          <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Nome completo" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cargo</Label>
          <RoleCombobox value={form.role_in_company} onChange={(v) => setForm((f) => ({ ...f, role_in_company: v }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Telefone</Label>
          <PhoneInput value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
        </div>
      </div>
      {isPrimaryToggleable && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="h-3.5 w-3.5" />
          Definir como contato principal
        </label>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={submitting}>
          <X className="mr-1 h-3.5 w-3.5" /> Cancelar
        </Button>
        <Button size="sm" onClick={handle} disabled={submitting}>
          <Save className="mr-1 h-3.5 w-3.5" /> {submitting ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function CardContatos({ companyId, companyLabel }: { companyId: string | null; companyLabel: string }) {
  const { data: contacts = [], isLoading } = useProjectContacts(companyId);
  const create = useCreateProjectContact();
  const update = useUpdateProjectContact();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Vincule um cliente a este projeto para gerenciar pessoas de contato.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando contatos…</p>
      ) : contacts.length === 0 && !adding ? (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center">
          <UserPlus className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-foreground">Nenhum contato cadastrado</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Adicione pessoas de {companyLabel} responsáveis pelo projeto.
          </p>
          <Button size="sm" className="mt-3" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar primeiro contato
          </Button>
        </div>
      ) : (
        <div className="-mx-2">
          {contacts.map((c) =>
            editingId === c.person_id ? (
              <div key={c.person_id} className="px-2 py-2">
                <ContactForm
                  initial={{
                    full_name: c.full_name,
                    role_in_company: c.role_in_company ?? "",
                    email: c.email ?? "",
                    phone: c.phone ?? "",
                  }}
                  onCancel={() => setEditingId(null)}
                  submitting={update.isPending}
                  submitLabel="Salvar"
                  onSubmit={(form) => {
                    update.mutate(
                      {
                        company_id: companyId,
                        person_id: c.person_id,
                        full_name: form.full_name,
                        email: form.email,
                        phone: form.phone,
                        role_in_company: form.role_in_company,
                      },
                      {
                        onSuccess: () => {
                          toast.success("Contato atualizado");
                          setEditingId(null);
                        },
                        onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar"),
                      },
                    );
                  }}
                />
              </div>
            ) : (
              <ContactRow key={c.person_id} contact={c} companyId={companyId} onEdit={() => setEditingId(c.person_id)} />
            ),
          )}
        </div>
      )}

      {adding && (
        <ContactForm
          isPrimaryToggleable
          initialIsPrimary={contacts.length === 0}
          onCancel={() => setAdding(false)}
          submitting={create.isPending}
          submitLabel="Adicionar contato"
          onSubmit={(form, isPrimary) => {
            create.mutate(
              {
                company_id: companyId,
                full_name: form.full_name,
                email: form.email,
                phone: form.phone,
                role_in_company: form.role_in_company,
                is_primary_contact: isPrimary || contacts.length === 0,
              },
              {
                onSuccess: () => {
                  toast.success("Contato adicionado");
                  setAdding(false);
                },
                onError: (e: any) => toast.error(e?.message ?? "Erro ao adicionar"),
              },
            );
          }}
        />
      )}

      {!adding && contacts.length > 0 && (
        <div className="pt-1">
          <Button size="sm" variant="ghost" className={cn("h-8 text-xs")} onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar contato
          </Button>
        </div>
      )}
    </div>
  );
}
