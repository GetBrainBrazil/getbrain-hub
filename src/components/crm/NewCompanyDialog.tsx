import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCompany } from '@/hooks/crm/useCrmReference';
import type { CompanyRelationshipStatus } from '@/types/crm';

const STATUS_OPTIONS: { value: CompanyRelationshipStatus; label: string }[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'lead', label: 'Lead' },
  { value: 'active_client', label: 'Cliente ativo' },
  { value: 'former_client', label: 'Ex-cliente' },
];

export function NewCompanyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const createCompany = useCreateCompany();
  const [form, setForm] = useState<{ legal_name: string; trade_name: string; cnpj: string; industry: string; website: string; relationship_status: CompanyRelationshipStatus }>({
    legal_name: '',
    trade_name: '',
    cnpj: '',
    industry: '',
    website: '',
    relationship_status: 'prospect',
  });

  useEffect(() => {
    if (!open) setForm({ legal_name: '', trade_name: '', cnpj: '', industry: '', website: '', relationship_status: 'prospect' });
  }, [open]);

  const submit = () => {
    if (!form.legal_name.trim()) {
      toast.error('Razão social é obrigatória');
      return;
    }
    createCompany.mutate(
      {
        legal_name: form.legal_name.trim(),
        trade_name: form.trade_name.trim() || null,
        cnpj: form.cnpj.trim() || null,
        industry: form.industry.trim() || null,
        website: form.website.trim() || null,
        relationship_status: form.relationship_status,
      },
      {
        onSuccess: (c) => {
          toast.success(`Empresa "${c.legal_name}" criada`);
          onOpenChange(false);
          navigate(`/crm/empresas/${c.id}`);
        },
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Erro ao criar empresa'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Empresa</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Razão social *</Label>
            <Input value={form.legal_name} onChange={(e) => setForm((f) => ({ ...f, legal_name: e.target.value }))} placeholder="Ex: ACME Tecnologia LTDA" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Nome fantasia</Label>
            <Input value={form.trade_name} onChange={(e) => setForm((f) => ({ ...f, trade_name: e.target.value }))} placeholder="ACME" />
          </div>
          <div className="space-y-1.5">
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
          </div>
          <div className="space-y-1.5">
            <Label>Indústria</Label>
            <Input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} placeholder="SaaS, Indústria, Varejo..." />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Status inicial</Label>
            <Select value={form.relationship_status} onValueChange={(v) => setForm((f) => ({ ...f, relationship_status: v as CompanyRelationshipStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={createCompany.isPending || !form.legal_name.trim()}>
            Criar e abrir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
