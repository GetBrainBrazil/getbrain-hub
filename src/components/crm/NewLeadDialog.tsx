import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateLead } from '@/hooks/crm/useLeads';
import { useAllLeads } from '@/hooks/crm/useCrmDetails';
import { useCompanies, useCreateCompany, useCreatePerson, useCrmActors, usePeopleByCompany } from '@/hooks/crm/useCrmReference';
import { useCrmLeadSources } from '@/hooks/crm/useCrmLeadSources';
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
  const [nestedCompany, setNestedCompany] = useState(false);
  const [nestedPerson, setNestedPerson] = useState(false);
  const [form, setForm] = useState({ title: '', company_id: '', contact_person_id: '', source: '', pain_description: '', estimated_value: '', owner_actor_id: '' });
  const [companyForm, setCompanyForm] = useState({ legal_name: '', cnpj: '', industry: '', website: '' });
  const [personForm, setPersonForm] = useState({ full_name: '', email: '', phone: '', role_in_company: '' });
  const { data: people = [] } = usePeopleByCompany(form.company_id || null);

  useEffect(() => { if (!form.owner_actor_id && actors[0]) setForm((f) => ({ ...f, owner_actor_id: actors[0].id })); }, [actors, form.owner_actor_id]);

  // Detecta lead aberto na mesma empresa para evitar duplicidade
  const openLeadForCompany = form.company_id ? allLeads.find((l) => l.company_id === form.company_id && !['descartado', 'convertido'].includes(l.status)) : null;

  const submit = () => createLead.mutate({
    title: form.title,
    company_id: form.company_id,
    contact_person_id: form.contact_person_id || null,
    source: form.source || null,
    pain_description: form.pain_description || null,
    estimated_value: parseCurrencyBRL(form.estimated_value),
    owner_actor_id: form.owner_actor_id || null,
  }, { onSuccess: (lead) => { toast.success(`Lead ${lead.code} criado com sucesso`); onOpenChange(false); navigate('/crm/leads'); } });

  const addCompany = () => createCompany.mutate(companyForm, { onSuccess: (company) => { setForm((f) => ({ ...f, company_id: company.id })); setNestedCompany(false); setCompanyForm({ legal_name: '', cnpj: '', industry: '', website: '' }); } });
  const addPerson = () => createPerson.mutate({ company_id: form.company_id, ...personForm }, { onSuccess: (person) => { setForm((f) => ({ ...f, contact_person_id: person.id })); setNestedPerson(false); setPersonForm({ full_name: '', email: '', phone: '', role_in_company: '' }); } });

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Novo Lead</DialogTitle></DialogHeader><div className="grid gap-4 py-2">
    <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Chatbot para atendimento comercial" /></div>
    <div className="grid grid-cols-[1fr_auto] gap-2"><div className="space-y-1.5"><Label>Empresa</Label><Select value={form.company_id} onValueChange={(v) => setForm((f) => ({ ...f, company_id: v, contact_person_id: '' }))}><SelectTrigger><SelectValue placeholder="Selecionar empresa" /></SelectTrigger><SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.trade_name || c.legal_name}</SelectItem>)}</SelectContent></Select></div><Button type="button" variant="outline" className="mt-6" onClick={() => setNestedCompany((v) => !v)}><Plus className="h-4 w-4" /></Button></div>
    {nestedCompany && <div className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-2"><Input placeholder="Nome da empresa" value={companyForm.legal_name} onChange={(e) => setCompanyForm((f) => ({ ...f, legal_name: e.target.value }))} /><Input placeholder="CNPJ" value={companyForm.cnpj} onChange={(e) => setCompanyForm((f) => ({ ...f, cnpj: e.target.value }))} /><Input placeholder="Indústria" value={companyForm.industry} onChange={(e) => setCompanyForm((f) => ({ ...f, industry: e.target.value }))} /><Input placeholder="Website" value={companyForm.website} onChange={(e) => setCompanyForm((f) => ({ ...f, website: e.target.value }))} /><Button className="md:col-span-2" onClick={addCompany} disabled={!companyForm.legal_name}>Criar empresa</Button></div>}
    {openLeadForCompany && (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
        <p className="font-medium text-warning">Esta empresa já possui um lead aberto: <span className="font-mono">{openLeadForCompany.code}</span> — "{openLeadForCompany.title}"</p>
        <p className="mt-1 text-muted-foreground">Você pode abrir o lead existente em vez de criar um novo. Se realmente for uma oportunidade separada, prossiga.</p>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => { onOpenChange(false); navigate(`/crm/leads/${openLeadForCompany.code}`); }}>Abrir lead existente</Button>
      </div>
    )}
    <div className="grid grid-cols-[1fr_auto] gap-2"><div className="space-y-1.5"><Label>Contato</Label><Select value={form.contact_person_id || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, contact_person_id: v === 'none' ? '' : v }))}><SelectTrigger><SelectValue placeholder="Selecionar contato" /></SelectTrigger><SelectContent><SelectItem value="none">Sem contato</SelectItem>{people.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent></Select></div><Button type="button" variant="outline" className="mt-6" disabled={!form.company_id} onClick={() => setNestedPerson((v) => !v)}><Plus className="h-4 w-4" /></Button></div>
    {nestedPerson && <div className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-2"><Input placeholder="Nome" value={personForm.full_name} onChange={(e) => setPersonForm((f) => ({ ...f, full_name: e.target.value }))} /><Input placeholder="E-mail" value={personForm.email} onChange={(e) => setPersonForm((f) => ({ ...f, email: e.target.value }))} /><Input placeholder="Telefone" value={personForm.phone} onChange={(e) => setPersonForm((f) => ({ ...f, phone: e.target.value }))} /><Input placeholder="Cargo" value={personForm.role_in_company} onChange={(e) => setPersonForm((f) => ({ ...f, role_in_company: e.target.value }))} /><Button className="md:col-span-2" onClick={addPerson} disabled={!personForm.full_name}>Criar contato</Button></div>}
    <div className="grid gap-3 md:grid-cols-3"><div className="space-y-1.5"><Label>Origem</Label><Select value={form.source || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, source: v === 'none' ? '' : v }))}><SelectTrigger><SelectValue placeholder="Selecionar origem" /></SelectTrigger><SelectContent><SelectItem value="none">Sem origem</SelectItem>{leadSources.map((s) => <SelectItem key={s.id} value={s.slug}>{s.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Valor estimado</Label><Input type="number" value={form.estimated_value} onChange={(e) => setForm((f) => ({ ...f, estimated_value: e.target.value }))} /></div><div className="space-y-1.5"><Label>Dono</Label><Select value={form.owner_actor_id} onValueChange={(v) => setForm((f) => ({ ...f, owner_actor_id: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{actors.map((a) => <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="space-y-1.5"><Label>Dor/situação</Label><Textarea value={form.pain_description} onChange={(e) => setForm((f) => ({ ...f, pain_description: e.target.value }))} /></div>
  </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={!form.title || !form.company_id || createLead.isPending}>Criar lead</Button></DialogFooter></DialogContent></Dialog>;
}
