import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, X, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  DEPENDENCY_TYPE_LABEL, DEPENDENCY_TYPE_OPTIONS, DEPENDENCY_TYPE_COLOR,
  DEPENDENCY_STATUS_LABEL, DEPENDENCY_STATUS_OPTIONS, DEPENDENCY_STATUS_COLOR,
  DEPENDENCY_PRIORITY_LABEL, DEPENDENCY_PRIORITY_OPTIONS, DEPENDENCY_PRIORITY_COLOR,
} from '@/constants/dealEnumLabels';
import type {
  DealDependency, DealDependencyStatus, DealDependencyType, DealDependencyPriority,
} from '@/types/crm';

const sb = supabase as any;

export interface DependencyFormPayload {
  dependency_type: DealDependencyType;
  description: string;
  responsible_person_name?: string | null;
  responsible_person_role?: string | null;
  responsible_email?: string | null;
  responsible_phone?: string | null;
  agreed_deadline?: string | null;
  requested_at?: string | null;
  status: DealDependencyStatus;
  priority: DealDependencyPriority;
  is_blocker: boolean;
  internal_owner_actor_id?: string | null;
  impact_if_missing?: string | null;
  links: string[];
  notes?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: 'create' | 'edit';
  dealCode?: string;
  dealTitle?: string;
  initial?: DealDependency;
  onSubmit: (payload: DependencyFormPayload) => Promise<void>;
}

function useActorsList() {
  return useQuery({
    queryKey: ['actors-min-list'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('actors')
        .select('id, display_name, avatar_url, type')
        .is('deleted_at', null)
        .eq('status', 'active')
        .order('display_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; display_name: string; avatar_url: string | null; type: string }[];
    },
  });
}

export function DependencyFullScreenForm({
  open, onOpenChange, mode, dealCode, dealTitle, initial, onSubmit,
}: Props) {
  const { data: actors = [] } = useActorsList();
  const today = new Date().toISOString().slice(0, 10);

  const [type, setType] = useState<DealDependencyType>('acesso_sistema');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState('');
  const [respName, setRespName] = useState('');
  const [respRole, setRespRole] = useState('');
  const [respEmail, setRespEmail] = useState('');
  const [respPhone, setRespPhone] = useState('');
  const [deadline, setDeadline] = useState('');
  const [requestedAt, setRequestedAt] = useState(today);
  const [status, setStatus] = useState<DealDependencyStatus>('aguardando_combinar');
  const [priority, setPriority] = useState<DealDependencyPriority>('media');
  const [isBlocker, setIsBlocker] = useState(false);
  const [internalOwner, setInternalOwner] = useState<string>('__none');
  const [notes, setNotes] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(initial?.dependency_type ?? 'acesso_sistema');
    setDescription(initial?.description ?? '');
    setImpact(initial?.impact_if_missing ?? '');
    setRespName(initial?.responsible_person_name ?? '');
    setRespRole(initial?.responsible_person_role ?? '');
    setRespEmail(initial?.responsible_email ?? '');
    setRespPhone(initial?.responsible_phone ?? '');
    setDeadline(initial?.agreed_deadline ?? '');
    setRequestedAt(initial?.requested_at ?? today);
    setStatus(initial?.status ?? 'aguardando_combinar');
    setPriority(initial?.priority ?? 'media');
    setIsBlocker(initial?.is_blocker ?? false);
    setInternalOwner(initial?.internal_owner_actor_id ?? '__none');
    setNotes(initial?.notes ?? '');
    setLinks(initial?.links ?? []);
    setNewLink('');
  }, [open, initial]);

  const addLink = () => {
    const v = newLink.trim();
    if (!v) return;
    if (links.includes(v)) {
      toast.error('Link já adicionado');
      return;
    }
    setLinks([...links, v]);
    setNewLink('');
  };

  const removeLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        dependency_type: type,
        description: description.trim(),
        responsible_person_name: respName.trim() || null,
        responsible_person_role: respRole.trim() || null,
        responsible_email: respEmail.trim() || null,
        responsible_phone: respPhone.trim() || null,
        agreed_deadline: deadline || null,
        requested_at: requestedAt || null,
        status,
        priority,
        is_blocker: isBlocker,
        internal_owner_actor_id: internalOwner === '__none' ? null : internalOwner,
        impact_if_missing: impact.trim() || null,
        links,
        notes: notes.trim() || null,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Erro ao salvar', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4"
        >
          {/* Header sticky */}
          <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border/60 bg-background/95 px-4 py-4 backdrop-blur md:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                  {mode === 'create' ? 'Nova dependência' : 'Editar dependência'}
                </DialogPrimitive.Title>
                {dealCode && (
                  <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {dealCode}
                  </span>
                )}
              </div>
              <DialogPrimitive.Description className="mt-0.5 line-clamp-1 text-xs text-muted-foreground md:text-sm">
                {dealTitle ? `${dealTitle} · ` : ''}
                O que precisa ser combinado/recebido do cliente para o projeto rodar.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </header>

          {/* Body scrollável */}
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-2">
              {/* COLUNA ESQUERDA */}
              <div className="space-y-5">
                {/* Tipo */}
                <div className="space-y-2">
                  <FieldLabel>Tipo</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {DEPENDENCY_TYPE_OPTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={cn(
                          'rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all',
                          type === t
                            ? cn(DEPENDENCY_TYPE_COLOR[t], 'ring-2 ring-accent/40')
                            : 'border-border bg-background text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {DEPENDENCY_TYPE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <FieldLabel required>Descrição</FieldLabel>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Acesso ao CRM atual via API. Liberar usuário com permissão read."
                    className="min-h-[90px] text-sm"
                  />
                </div>

                {/* Impacto se não cumprida */}
                <div className="space-y-2">
                  <FieldLabel>Impacto se não cumprida</FieldLabel>
                  <Textarea
                    value={impact}
                    onChange={(e) => setImpact(e.target.value)}
                    placeholder="Ex: Bloqueia integração; sem isso, equipe começa manual e perde 20h/mês."
                    className="min-h-[70px] text-sm"
                  />
                </div>

                {/* Responsável */}
                <div className="space-y-3 rounded-lg border border-border/60 bg-card/30 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Responsável (lado do cliente)
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <FieldLabel>Nome</FieldLabel>
                      <Input value={respName} onChange={(e) => setRespName(e.target.value)} placeholder="Ex: João Silva" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Função / cargo</FieldLabel>
                      <Input value={respRole} onChange={(e) => setRespRole(e.target.value)} placeholder="Ex: CTO" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>E-mail</FieldLabel>
                      <Input type="email" value={respEmail} onChange={(e) => setRespEmail(e.target.value)} placeholder="joao@empresa.com" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Telefone / WhatsApp</FieldLabel>
                      <Input value={respPhone} onChange={(e) => setRespPhone(e.target.value)} placeholder="(11) 99999-0000" className="h-9 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Notas */}
                <div className="space-y-2">
                  <FieldLabel>Notas internas</FieldLabel>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contexto adicional, conversas, decisões..."
                    className="min-h-[70px] text-sm"
                  />
                </div>
              </div>

              {/* COLUNA DIREITA */}
              <div className="space-y-5">
                {/* Status */}
                <div className="space-y-2">
                  <FieldLabel>Status</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {DEPENDENCY_STATUS_OPTIONS.filter((s) => s !== 'atrasado').map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={cn(
                          'rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all',
                          status === s
                            ? cn(DEPENDENCY_STATUS_COLOR[s], 'ring-2 ring-accent/40')
                            : 'border-border bg-background text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {DEPENDENCY_STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prioridade */}
                <div className="space-y-2">
                  <FieldLabel>Prioridade</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {DEPENDENCY_PRIORITY_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                          'rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all',
                          priority === p
                            ? cn(DEPENDENCY_PRIORITY_COLOR[p], 'ring-2 ring-accent/40')
                            : 'border-border bg-background text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {DEPENDENCY_PRIORITY_LABEL[p]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <FieldLabel>Prazo combinado</FieldLabel>
                    <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Solicitado em</FieldLabel>
                    <Input type="date" value={requestedAt} onChange={(e) => setRequestedAt(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>

                {/* Dono interno */}
                <div className="space-y-1.5">
                  <FieldLabel>Dono interno (quem persegue)</FieldLabel>
                  <Select value={internalOwner} onValueChange={setInternalOwner}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione um responsável interno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Sem dono definido</SelectItem>
                      {actors.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bloqueador */}
                <button
                  type="button"
                  onClick={() => setIsBlocker((v) => !v)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all',
                    isBlocker
                      ? 'border-destructive/60 bg-destructive/10'
                      : 'border-border/60 bg-card/30 hover:border-border',
                  )}
                >
                  <div className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2',
                    isBlocker ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-border',
                  )}>
                    {isBlocker && <span className="text-xs leading-none">✓</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <AlertTriangle className={cn('h-3.5 w-3.5', isBlocker ? 'text-destructive' : 'text-muted-foreground')} />
                      Esta dependência bloqueia o início do projeto
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Se marcada, ganha destaque visual e entra na contagem de blockers do deal.
                    </p>
                  </div>
                </button>

                {/* Links */}
                <div className="space-y-2">
                  <FieldLabel>Links / referências</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      value={newLink}
                      onChange={(e) => setNewLink(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
                      placeholder="https://..."
                      className="h-9 text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addLink} className="h-9 shrink-0">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {links.length > 0 && (
                    <ul className="space-y-1.5">
                      {links.map((l, i) => (
                        <li key={i} className="flex items-center gap-2 rounded-md border border-border/60 bg-card/30 px-2.5 py-1.5 text-xs">
                          <LinkIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <a href={l} target="_blank" rel="noreferrer" className="flex-1 truncate text-foreground hover:text-accent">
                            {l}
                          </a>
                          <button
                            type="button"
                            onClick={() => removeLink(i)}
                            className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer sticky */}
          <footer className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur md:px-8">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : mode === 'create' ? 'Adicionar dependência' : 'Salvar alterações'}
            </Button>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
      {required && <span className="ml-1 text-destructive">*</span>}
    </Label>
  );
}
