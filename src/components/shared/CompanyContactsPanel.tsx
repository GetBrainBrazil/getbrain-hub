/**
 * Painel de contatos compartilhado entre Projetos e CRM.
 *
 * Recursos:
 *   - Avatares com iniciais
 *   - Edição inline (nome, cargo livre, email com mask, telefone com mask BR)
 *   - Links mailto: e tel:
 *   - Marcar como contato principal
 *   - Remover do vínculo (soft via ended_at)
 *   - Sugestão de cargos já existentes (combobox "type to create")
 *   - [Opcional CRM] Papéis comerciais via catálogo `crm_contact_roles`
 *     (badges coloridos, type-to-create no popover)
 *
 * Compartilha as MESMAS tabelas (`people`, `company_people`,
 * `crm_contact_roles`, `company_contact_roles`) usadas no CRM,
 * garantindo paridade de dados entre módulos.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  Mail, Phone, Plus, Star, StarOff, Trash2, Save, X, User,
  Building2, UserPlus, Check, ChevronsUpDown, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatPhoneBR } from "@/lib/formatters";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  ProjectContact,
  useCreateProjectContact,
  useProjectContacts,
  useSetPrimaryContact,
  useUnlinkProjectContact,
  useUpdateProjectContact,
} from "@/hooks/projetos/useProjectContacts";
import {
  useCompanyContactsWithRoles,
} from "@/hooks/crm/useCompanyContacts";
import {
  useAddContactRole, useRemoveContactRole,
} from "@/hooks/crm/useCompanyContactRoles";
import { useCrmContactRoles, useCreateContactRole } from "@/hooks/crm/useCrmContactRoles";

const FALLBACK_COLOR = "#94A3B8";

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

function badgeStyle(color?: string | null): React.CSSProperties {
  const c = color || FALLBACK_COLOR;
  return { backgroundColor: `${c}26`, color: c, borderColor: `${c}4D` };
}

function PhoneInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Input
      value={formatPhoneBR(value)}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 15))}
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

  const select = (v: string) => { onChange(v); setOpen(false); setSearch(""); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open}
          className="w-full justify-between font-normal">
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

/** Picker de PAPEL COMERCIAL (somente CRM/showRoles). */
function CommercialRolePicker({
  available, onPick, onCreate,
}: {
  available: { id: string; name: string; color: string | null }[];
  onPick: (roleId: string) => void;
  onCreate: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const exact = useMemo(
    () => available.find((r) => r.name.toLowerCase() === trimmed.toLowerCase()),
    [available, trimmed],
  );
  const showCreate = trimmed.length > 0 && !exact;

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground">
          <Tag className="mr-0.5 h-2.5 w-2.5" /> papel
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <Command shouldFilter>
          <CommandInput placeholder="Buscar ou criar papel…" value={query} onValueChange={setQuery} className="h-8" />
          <CommandList>
            <CommandEmpty className="py-2 text-center text-[11px] text-muted-foreground">
              {showCreate ? "Pressione Enter para criar" : "Nenhum papel disponível"}
            </CommandEmpty>
            {available.length > 0 && (
              <CommandGroup>
                {available.map((r) => (
                  <CommandItem
                    key={r.id} value={r.name}
                    onSelect={() => { onPick(r.id); setOpen(false); setQuery(""); }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
                      style={{ background: r.color ?? FALLBACK_COLOR }} />
                    <span className="flex-1 truncate">{r.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreate && (
              <CommandGroup heading="Criar">
                <CommandItem value={`__create__${trimmed}`}
                  onSelect={() => { onCreate(trimmed); setOpen(false); setQuery(""); }}
                  className="flex items-center gap-2 text-xs text-accent">
                  <Plus className="h-3 w-3" />
                  <span className="truncate">Criar "{trimmed}"</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ContactForm({
  initial, isPrimaryToggleable, initialIsPrimary, onCancel, onSubmit, submitting, submitLabel,
  onMakePrimary, onRemove, isAlreadyPrimary,
}: {
  initial?: FormState;
  isPrimaryToggleable?: boolean;
  initialIsPrimary?: boolean;
  onCancel: () => void;
  onSubmit: (form: FormState, isPrimary: boolean) => void;
  submitting: boolean;
  submitLabel: string;
  /** Quando presente, mostra botão "Definir como principal" no rodapé (modo edição). */
  onMakePrimary?: () => void;
  /** Quando presente, mostra botão "Remover contato" no rodapé (modo edição). */
  onRemove?: () => void;
  isAlreadyPrimary?: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial ?? emptyForm);
  const [isPrimary, setIsPrimary] = useState(!!initialIsPrimary);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialRef = useRef<FormState>(initial ?? emptyForm);
  const initialPrimaryRef = useRef<boolean>(!!initialIsPrimary);
  // Refs sempre atualizadas para uso dentro do listener global
  const formRef = useRef(form);
  const isPrimaryRef = useRef(isPrimary);
  const submittingRef = useRef(submitting);
  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => { isPrimaryRef.current = isPrimary; }, [isPrimary]);
  useEffect(() => { submittingRef.current = submitting; }, [submitting]);

  const isDirty = (f: FormState, p: boolean) => {
    const i = initialRef.current;
    return (
      f.full_name !== i.full_name ||
      f.role_in_company !== i.role_in_company ||
      f.email !== i.email ||
      f.phone !== i.phone ||
      p !== initialPrimaryRef.current
    );
  };

  const handle = () => {
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    onSubmit(form, isPrimary);
  };

  // Click-fora: salva se válido+modificado, senão cancela.
  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      const target = ev.target as Node | null;
      if (!target || !containerRef.current) return;
      if (containerRef.current.contains(target)) return;
      // Ignora cliques em portais de Popover/Command/Dialog (Radix usa data-radix-portal/popper)
      const el = target as HTMLElement;
      if (el.closest?.("[data-radix-popper-content-wrapper], [role='dialog'], [data-sonner-toaster]")) return;
      if (submittingRef.current) return;

      const f = formRef.current;
      const p = isPrimaryRef.current;
      if (!isDirty(f, p)) { onCancel(); return; }
      const parsed = contactSchema.safeParse(f);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
        return;
      }
      onSubmit(f, p);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="rounded-md border border-accent/30 bg-accent/5 p-3">
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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {onMakePrimary && (
            isAlreadyPrimary ? (
              <Button size="sm" variant="ghost" onClick={onMakePrimary} disabled={submitting}
                className="text-xs text-muted-foreground hover:text-foreground">
                <StarOff className="mr-1 h-3.5 w-3.5" /> Remover como principal
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={onMakePrimary} disabled={submitting} className="text-xs">
                <Star className="mr-1 h-3.5 w-3.5" /> Definir como principal
              </Button>
            )
          )}
          {onRemove && (
            <Button size="sm" variant="ghost" onClick={onRemove} disabled={submitting}
              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover contato
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={submitting}>
            <X className="mr-1 h-3.5 w-3.5" /> Cancelar
          </Button>
          <Button size="sm" onClick={handle} disabled={submitting}>
            <Save className="mr-1 h-3.5 w-3.5" /> {submitting ? "Salvando…" : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PanelProps {
  companyId: string | null;
  companyLabel: string;
  /** Quando true, exibe badges de papéis comerciais (catálogo `crm_contact_roles`). */
  showRoles?: boolean;
  /**
   * No CRM, o "principal" pode ser definido por DEAL (não pela empresa).
   * Se fornecido, a estrela controla esta callback ao invés de gravar em `company_people.is_primary_contact`.
   */
  primaryContactPersonId?: string | null;
  onMakePrimary?: (personId: string | null) => void;
}

export function CompanyContactsPanel({
  companyId,
  companyLabel,
  showRoles = false,
  primaryContactPersonId,
  onMakePrimary,
}: PanelProps) {
  const { data: contacts = [], isLoading } = useProjectContacts(companyId);
  // Se vai mostrar papéis comerciais, busca também o mapa de roles por link.
  const { data: contactsWithRoles } = useCompanyContactsWithRoles(showRoles ? companyId ?? undefined : undefined);
  const { data: catalog = [] } = useCrmContactRoles({ onlyActive: true });

  const create = useCreateProjectContact();
  const update = useUpdateProjectContact();
  const setPrimaryCompany = useSetPrimaryContact();
  const unlink = useUnlinkProjectContact();
  const addRole = useAddContactRole();
  const removeRole = useRemoveContactRole();
  const createRole = useCreateContactRole();

  const { confirm, dialog: confirmDialog } = useConfirm();
  const [adding, setAdding] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

  // Index roles por link_id para fácil acesso
  const rolesByLinkId = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string | null; role_link_id: string }[]>();
    (contactsWithRoles ?? []).forEach((c) => {
      map.set(
        c.link_id,
        c.roles.map((r) => ({
          id: r.role_id,
          name: r.role_ref?.name ?? r.role ?? "Papel",
          color: r.role_ref?.color ?? null,
          role_link_id: r.id,
        })),
      );
    });
    return map;
  }, [contactsWithRoles]);

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Vincule um cliente para gerenciar pessoas de contato.
      </p>
    );
  }

  const handleUnlink = async (c: ProjectContact) => {
    const ok = await confirm({
      title: "Remover contato?",
      description: `${c.full_name} continuará existindo, mas não estará mais vinculado a esta empresa.`,
      confirmLabel: "Remover",
      variant: "destructive",
    });
    if (!ok) return;
    unlink.mutate(
      { company_id: companyId, link_id: c.link_id },
      { onSuccess: () => toast.success("Contato removido") },
    );
  };

  const handleTogglePrimary = (c: ProjectContact) => {
    if (onMakePrimary) {
      // Modo CRM/Deal: alterna entre setar como principal ou limpar.
      const isCurrent = c.person_id === primaryContactPersonId;
      onMakePrimary(isCurrent ? null : c.person_id);
      return;
    }
    if (c.is_primary_contact) return;
    setPrimaryCompany.mutate(
      { company_id: companyId, link_id: c.link_id },
      { onSuccess: () => toast.success("Contato principal atualizado") },
    );
  };

  const isPrimaryFor = (c: ProjectContact) => {
    if (onMakePrimary) return c.person_id === primaryContactPersonId;
    return c.is_primary_contact;
  };

  return (
    <div className="space-y-2">
      {confirmDialog}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando contatos…</p>
      ) : contacts.length === 0 && !adding ? (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center">
          <UserPlus className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-foreground">Nenhum contato cadastrado</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Adicione pessoas de {companyLabel} responsáveis pelo relacionamento.
          </p>
          <Button size="sm" className="mt-3" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar primeiro contato
          </Button>
        </div>
      ) : (
        <div className="-mx-2">
          {contacts.map((c) => {
            if (editingPersonId === c.person_id) {
              const isPrimary = isPrimaryFor(c);
              return (
                <div key={c.person_id} className="px-2 py-2">
                  <ContactForm
                    initial={{
                      full_name: c.full_name,
                      role_in_company: c.role_in_company ?? "",
                      email: c.email ?? "",
                      phone: c.phone ?? "",
                    }}
                    onCancel={() => setEditingPersonId(null)}
                    submitting={update.isPending}
                    submitLabel="Salvar"
                    isAlreadyPrimary={isPrimary}
                    onMakePrimary={() => handleTogglePrimary(c)}
                    onRemove={async () => {
                      await handleUnlink(c);
                      setEditingPersonId(null);
                    }}
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
                          onSuccess: () => { toast.success("Contato atualizado"); setEditingPersonId(null); },
                          onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar"),
                        },
                      );
                    }}
                  />
                </div>
              );
            }

            const primary = isPrimaryFor(c);
            const linkRoles = rolesByLinkId.get(c.link_id) ?? [];
            const usedRoleIds = new Set(linkRoles.map((r) => r.id));
            const availableRoles = catalog.filter((r) => !usedRoleIds.has(r.id));

            const openEdit = () => setEditingPersonId(c.person_id);
            const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

            return (
              <div
                key={c.person_id}
                role="button"
                tabIndex={0}
                aria-label={`Editar contato ${c.full_name}`}
                onClick={openEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEdit(); }
                }}
                className={cn(
                  "group/contact flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-all",
                  "hover:border-accent/40 hover:bg-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  primary ? "border-accent/40 bg-accent/[0.03]" : "border-transparent",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                  {initials(c.full_name) || <User className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{c.full_name}</span>
                    {primary && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                        <Star className="h-2.5 w-2.5 fill-current" /> Principal
                      </span>
                    )}
                    {c.role_in_company && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {c.role_in_company}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        onClick={stop}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <Mail className="h-3 w-3" />{c.email}
                      </a>
                    )}
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        onClick={stop}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <Phone className="h-3 w-3" />{formatPhoneBR(c.phone)}
                      </a>
                    )}
                    {!c.email && !c.phone && <span className="italic">Sem contato cadastrado</span>}
                  </div>

                  {showRoles && (
                    <div
                      className="mt-1.5 flex flex-wrap items-center gap-1"
                      onClick={stop}
                      onKeyDown={stop}
                    >
                      {linkRoles.map((r) => (
                        <Badge
                          key={r.role_link_id}
                          variant="outline"
                          className="h-5 gap-1 border px-1.5 text-[10px] font-medium"
                          style={badgeStyle(r.color)}
                        >
                          {r.name}
                          <button
                            type="button"
                            aria-label={`Remover papel ${r.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRole.mutate(
                                { id: r.role_link_id, company_person_id: c.link_id },
                                { onError: (e: any) => toast.error(`Falhou: ${e?.message ?? ""}`) },
                              );
                            }}
                            className="hover:opacity-70"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                      <CommercialRolePicker
                        available={availableRoles}
                        onPick={(roleId) => addRole.mutate(
                          { company_person_id: c.link_id, role_id: roleId },
                          { onError: (e: any) => toast.error(`Falhou: ${e?.message ?? ""}`) },
                        )}
                        onCreate={(name) => createRole.mutate(
                          { name, color: FALLBACK_COLOR },
                          {
                            onSuccess: (created) => {
                              addRole.mutate(
                                { company_person_id: c.link_id, role_id: created.id },
                                { onError: (e: any) => toast.error(`Falhou: ${e?.message ?? ""}`) },
                              );
                              toast.success(`Papel "${created.name}" criado`);
                            },
                          },
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
                onSuccess: () => { toast.success("Contato adicionado"); setAdding(false); },
                onError: (e: any) => toast.error(e?.message ?? "Erro ao adicionar"),
              },
            );
          }}
        />
      )}

      {!adding && contacts.length > 0 && (
        <div className="pt-1">
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar contato
          </Button>
        </div>
      )}
    </div>
  );
}
