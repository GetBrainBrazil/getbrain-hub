import { useMemo, useState } from 'react';
import { Plus, Star, X, UserPlus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import {
  useCompanyContactsWithRoles,
  useCreateContactForCompany,
} from '@/hooks/crm/useCompanyContacts';
import {
  useAddContactRole, useRemoveContactRole,
} from '@/hooks/crm/useCompanyContactRoles';
import { useCrmContactRoles, useCreateContactRole } from '@/hooks/crm/useCrmContactRoles';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  primaryContactId: string | null;
  onMakePrimary?: (personId: string) => void;
}

const FALLBACK_COLOR = '#94A3B8';

function badgeStyle(color?: string | null): React.CSSProperties {
  const c = color || FALLBACK_COLOR;
  return {
    backgroundColor: `${c}26`, // ~15% alpha
    color: c,
    borderColor: `${c}4D`,     // ~30% alpha
  };
}

export function CompanyContactsManager({ companyId, primaryContactId, onMakePrimary }: Props) {
  const { data: contacts, isLoading } = useCompanyContactsWithRoles(companyId);
  const { data: catalog = [] } = useCrmContactRoles({ onlyActive: true });
  const createContact = useCreateContactForCompany();
  const addRole = useAddContactRole();
  const removeRole = useRemoveContactRole();
  const createRole = useCreateContactRole();
  const [openNew, setOpenNew] = useState(false);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Carregando contatos…</p>;
  }

  const list = contacts ?? [];

  return (
    <div className="space-y-2">
      {list.length === 0 ? (
        <button
          type="button"
          onClick={() => setOpenNew(true)}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background/30 px-3 py-4 text-sm text-muted-foreground transition-colors hover:border-accent/40 hover:bg-muted/30 hover:text-foreground"
        >
          <UserPlus className="h-4 w-4" />
          Nenhum contato vinculado. Adicionar o primeiro.
        </button>
      ) : (
        <ul className="space-y-1.5">
          {list.map((c) => {
            const isPrimary = c.person.id === primaryContactId;
            const usedRoleIds = new Set(c.roles.map((r) => r.role_id));
            const availableRoles = catalog.filter((r) => !usedRoleIds.has(r.id));
            return (
              <li
                key={c.link_id}
                className={cn(
                  'flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border bg-background/40 px-3 py-2',
                  isPrimary ? 'border-accent/40' : 'border-border',
                )}
              >
                <button
                  type="button"
                  onClick={() => onMakePrimary?.(c.person.id)}
                  title={isPrimary ? 'Contato principal do deal' : 'Tornar contato principal do deal'}
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                    isPrimary
                      ? 'border-accent bg-accent/20 text-accent'
                      : 'border-border text-muted-foreground hover:border-accent hover:text-accent',
                  )}
                >
                  <Star className={cn('h-3 w-3', isPrimary && 'fill-current')} />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{c.person.full_name}</p>
                    {c.person.role_in_company && (
                      <span className="truncate text-[11px] text-muted-foreground">
                        {c.person.role_in_company}
                      </span>
                    )}
                  </div>
                  {(c.person.email || c.person.phone) && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {[c.person.email, c.person.phone].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {c.roles.map((r) => {
                    const label = r.role_ref?.name ?? r.role ?? 'Papel';
                    const color = r.role_ref?.color;
                    return (
                      <Badge
                        key={r.id}
                        variant="outline"
                        className="h-5 gap-1 px-1.5 text-[10px] font-medium border"
                        style={badgeStyle(color)}
                      >
                        {label}
                        <button
                          type="button"
                          aria-label={`Remover papel ${label}`}
                          onClick={() =>
                            removeRole.mutate(
                              { id: r.id, company_person_id: c.link_id },
                              { onError: (e: any) => toast.error(`Falhou: ${e?.message ?? ''}`) },
                            )
                          }
                          className="hover:opacity-70"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    );
                  })}

                  <RolePicker
                    available={availableRoles}
                    onPick={(roleId) =>
                      addRole.mutate(
                        { company_person_id: c.link_id, role_id: roleId },
                        { onError: (e: any) => toast.error(`Falhou: ${e?.message ?? ''}`) },
                      )
                    }
                    onCreate={(name) =>
                      createRole.mutate(
                        { name, color: FALLBACK_COLOR },
                        {
                          onSuccess: (created) => {
                            addRole.mutate(
                              { company_person_id: c.link_id, role_id: created.id },
                              { onError: (e: any) => toast.error(`Falhou: ${e?.message ?? ''}`) },
                            );
                            toast.success(`Papel "${created.name}" criado`);
                          },
                        },
                      )
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpenNew(true)}
        className="h-7 gap-1.5 border-dashed text-xs"
      >
        <Plus className="h-3 w-3" /> Adicionar contato
      </Button>

      <NewContactDialog
        open={openNew}
        onOpenChange={setOpenNew}
        onSubmit={(payload) => {
          createContact.mutate(
            { company_id: companyId, ...payload },
            {
              onSuccess: () => {
                toast.success('Contato adicionado');
                setOpenNew(false);
              },
              onError: (e: any) => toast.error(`Erro: ${e?.message ?? 'falhou'}`),
            },
          );
        }}
        loading={createContact.isPending}
      />
    </div>
  );
}

function RolePicker({
  available, onPick, onCreate,
}: {
  available: { id: string; name: string; color: string | null }[];
  onPick: (roleId: string) => void;
  onCreate: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const exact = useMemo(
    () => available.find((r) => r.name.toLowerCase() === trimmed.toLowerCase()),
    [available, trimmed],
  );
  const showCreate = trimmed.length > 0 && !exact;

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(''); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground">
          <Plus className="mr-0.5 h-2.5 w-2.5" /> papel
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <Command shouldFilter>
          <CommandInput
            placeholder="Buscar ou criar…"
            value={query}
            onValueChange={setQuery}
            className="h-8"
          />
          <CommandList>
            <CommandEmpty className="py-2 text-center text-[11px] text-muted-foreground">
              {showCreate ? 'Pressione Enter para criar' : 'Nenhum papel disponível'}
            </CommandEmpty>
            {available.length > 0 && (
              <CommandGroup>
                {available.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={r.name}
                    onSelect={() => { onPick(r.id); setOpen(false); setQuery(''); }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
                      style={{ background: r.color ?? FALLBACK_COLOR }}
                    />
                    <span className="flex-1 truncate">{r.name}</span>
                    <Check className="h-3 w-3 opacity-0" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreate && (
              <CommandGroup heading="Criar">
                <CommandItem
                  value={`__create__${trimmed}`}
                  onSelect={() => { onCreate(trimmed); setOpen(false); setQuery(''); }}
                  className="flex items-center gap-2 text-xs text-accent"
                >
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

function NewContactDialog({
  open, onOpenChange, onSubmit, loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (p: { full_name: string; email?: string; phone?: string; role_in_company?: string }) => void;
  loading: boolean;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');

  const reset = () => { setFullName(''); setEmail(''); setPhone(''); setRole(''); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo contato</DialogTitle>
          <DialogDescription>Cria a pessoa e vincula à empresa do deal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome completo *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex: Maria Silva" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="maria@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 9..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cargo na empresa</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex: Diretora de TI" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button
            onClick={() => onSubmit({ full_name: fullName, email, phone, role_in_company: role })}
            disabled={!fullName.trim() || loading}
          >
            {loading ? 'Salvando…' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
