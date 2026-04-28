import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ComboboxCreate } from '@/components/crm/ComboboxCreate';
import { useCreateLead } from '@/hooks/crm/useLeads';
import { useAllLeads } from '@/hooks/crm/useCrmDetails';
import {
  useCompanies,
  useCreateCompany,
  useCreatePerson,
  useCrmActors,
  usePeopleByCompany,
} from '@/hooks/crm/useCrmReference';
import {
  useCreateLeadSource,
  useCrmLeadSources,
} from '@/hooks/crm/useCrmLeadSources';
import { maskCurrencyBRL, parseCurrencyBRL } from '@/lib/formatters';

export function NewLeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { data: companies = [] } = useCompanies();
  const { data: allLeads = [] } = useAllLeads();
  const { data: actors = [] } = useCrmActors();
  const { data: leadSources = [] } = useCrmLeadSources({ onlyActive: true });
  const createLead = useCreateLead();
  const createCompany = useCreateCompany();
  const createPerson = useCreatePerson();
  const createSource = useCreateLeadSource();

  const [form, setForm] = useState({
    title: '',
    company_id: '',
    contact_person_id: '',
    source: '',
    pain_description: '',
    estimated_value: '',
    owner_actor_id: '',
  });

  const { data: people = [] } = usePeopleByCompany(form.company_id || null);

  useEffect(() => {
    if (!form.owner_actor_id && actors[0]) setForm((f) => ({ ...f, owner_actor_id: actors[0].id }));
  }, [actors, form.owner_actor_id]);

  // Reseta tudo ao fechar
  useEffect(() => {
    if (!open) {
      setForm({
        title: '',
        company_id: '',
        contact_person_id: '',
        source: '',
        pain_description: '',
        estimated_value: '',
        owner_actor_id: actors[0]?.id ?? '',
      });
    }
  }, [open, actors]);

  // Detecta lead aberto na mesma empresa para evitar duplicidade
  const openLeadForCompany = form.company_id
    ? allLeads.find((l) => l.company_id === form.company_id && !['descartado', 'convertido'].includes(l.status))
    : null;

  const submit = () =>
    createLead.mutate(
      {
        title: form.title,
        company_id: form.company_id,
        contact_person_id: form.contact_person_id || null,
        source: form.source || null,
        pain_description: form.pain_description || null,
        estimated_value: parseCurrencyBRL(form.estimated_value),
        owner_actor_id: form.owner_actor_id || null,
      },
      {
        onSuccess: (lead) => {
          toast.success(`Lead ${lead.code} criado com sucesso`);
          onOpenChange(false);
          navigate('/crm/leads');
        },
      },
    );

  const handleCreateCompany = (name: string) =>
    new Promise<void>((resolve, reject) => {
      createCompany.mutate(
        { legal_name: name },
        {
          onSuccess: (company) => {
            setForm((f) => ({ ...f, company_id: company.id, contact_person_id: '' }));
            toast.success(`Empresa "${company.legal_name}" criada`);
            resolve();
          },
          onError: (e: any) => {
            toast.error(e?.message ?? 'Erro ao criar empresa');
            reject(e);
          },
        },
      );
    });

  const handleCreatePerson = (name: string) =>
    new Promise<void>((resolve, reject) => {
      if (!form.company_id) {
        toast.error('Selecione uma empresa primeiro');
        return reject(new Error('no company'));
      }
      createPerson.mutate(
        { company_id: form.company_id, full_name: name },
        {
          onSuccess: (person) => {
            setForm((f) => ({ ...f, contact_person_id: person.id }));
            toast.success(`Contato "${person.full_name}" criado`);
            resolve();
          },
          onError: (e: any) => {
            toast.error(e?.message ?? 'Erro ao criar contato');
            reject(e);
          },
        },
      );
    });

  const handleCreateSource = (name: string) =>
    new Promise<void>((resolve, reject) => {
      createSource.mutate(
        { name },
        {
          onSuccess: (src) => {
            setForm((f) => ({ ...f, source: src.slug }));
            resolve();
          },
          onError: (e: any) => reject(e),
        },
      );
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Chatbot para atendimento comercial"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <ComboboxCreate
              value={form.company_id}
              onChange={(v) => setForm((f) => ({ ...f, company_id: v, contact_person_id: '' }))}
              onCreate={handleCreateCompany}
              options={companies.map((c) => ({
                value: c.id,
                label: c.trade_name || c.legal_name,
                hint: c.trade_name && c.legal_name !== c.trade_name ? c.legal_name : undefined,
              }))}
              placeholder="Buscar empresa ou digitar para criar"
              searchPlaceholder="Digite o nome da empresa..."
              createLabel={(t) => `Criar empresa "${t}"`}
            />
          </div>

          {openLeadForCompany && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
              <p className="font-medium text-warning">
                Esta empresa já possui um lead aberto:{' '}
                <span className="font-mono">{openLeadForCompany.code}</span> — "{openLeadForCompany.title}"
              </p>
              <p className="mt-1 text-muted-foreground">
                Você pode abrir o lead existente em vez de criar um novo. Se realmente for uma oportunidade separada, prossiga.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/crm/leads/${openLeadForCompany.code}`);
                }}
              >
                Abrir lead existente
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Contato</Label>
            <ComboboxCreate
              value={form.contact_person_id}
              onChange={(v) => setForm((f) => ({ ...f, contact_person_id: v }))}
              onCreate={form.company_id ? handleCreatePerson : undefined}
              options={people.map((p) => ({
                value: p.id,
                label: p.full_name,
                hint: p.role_in_company || p.email || undefined,
              }))}
              placeholder={form.company_id ? 'Buscar contato ou digitar para criar' : 'Selecione a empresa primeiro'}
              searchPlaceholder="Digite o nome do contato..."
              createLabel={(t) => `Criar contato "${t}"`}
              disabled={!form.company_id}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <ComboboxCreate
                value={form.source}
                onChange={(v) => setForm((f) => ({ ...f, source: v }))}
                onCreate={handleCreateSource}
                options={leadSources.map((s) => ({ value: s.slug, label: s.name }))}
                placeholder="Buscar ou criar origem"
                searchPlaceholder="Ex: Instagram, Indicação..."
                createLabel={(t) => `Criar origem "${t}"`}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor estimado</Label>
              <Input
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={form.estimated_value}
                onChange={(e) => setForm((f) => ({ ...f, estimated_value: maskCurrencyBRL(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dono</Label>
              <Select value={form.owner_actor_id} onValueChange={(v) => setForm((f) => ({ ...f, owner_actor_id: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Dor/situação</Label>
            <Textarea
              value={form.pain_description}
              onChange={(e) => setForm((f) => ({ ...f, pain_description: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!form.title || !form.company_id || createLead.isPending}>
            Criar lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
