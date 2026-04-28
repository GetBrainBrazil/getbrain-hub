import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ComboboxCreate } from '@/components/crm/ComboboxCreate';
import { useCreateLead } from '@/hooks/crm/useLeads';
import { useAllLeads } from '@/hooks/crm/useCrmDetails';
import { useCompanies, useCreateCompany } from '@/hooks/crm/useCrmReference';

/**
 * Fluxo enxuto: usuário escolhe (ou cria) a empresa e o lead é criado
 * imediatamente com placeholders. A edição completa acontece na ficha do
 * lead (`/crm/leads/:code`), onde todos os campos são inline-editáveis.
 */
export function NewLeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { data: companies = [] } = useCompanies();
  const { data: allLeads = [] } = useAllLeads();
  const createLead = useCreateLead();
  const createCompany = useCreateCompany();

  const [companyId, setCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setCompanyId('');
      setSubmitting(false);
    }
  }, [open]);

  const openLeadForCompany = companyId
    ? allLeads.find((l) => l.company_id === companyId && !['descartado', 'convertido'].includes(l.status))
    : null;

  const company = companies.find((c) => c.id === companyId);
  const companyLabel = company?.trade_name || company?.legal_name || '';

  const handleCreateCompany = (name: string) =>
    new Promise<void>((resolve, reject) => {
      createCompany.mutate(
        { legal_name: name },
        {
          onSuccess: (c) => {
            setCompanyId(c.id);
            toast.success(`Empresa "${c.legal_name}" criada`);
            resolve();
          },
          onError: (e: any) => {
            toast.error(e?.message ?? 'Erro ao criar empresa');
            reject(e);
          },
        },
      );
    });

  const submit = () => {
    if (!companyId) return;
    setSubmitting(true);
    createLead.mutate(
      {
        title: `Novo lead — ${companyLabel || 'sem título'}`,
        company_id: companyId,
      },
      {
        onSuccess: (lead) => {
          toast.success(`Lead ${lead.code} criado`);
          onOpenChange(false);
          navigate(`/crm/leads/${lead.code}`);
        },
        onError: (e: any) => {
          toast.error(e?.message ?? 'Erro ao criar lead');
          setSubmitting(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <ComboboxCreate
              value={companyId}
              onChange={setCompanyId}
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
            <p className="text-xs text-muted-foreground">
              O lead é criado imediatamente. Você completa título, contato, origem, valor e mais na ficha do lead.
            </p>
          </div>

          {openLeadForCompany && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
              <p className="font-medium text-warning">
                Esta empresa já tem um lead aberto:{' '}
                <span className="font-mono">{openLeadForCompany.code}</span> — "{openLeadForCompany.title}"
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!companyId || submitting || createLead.isPending}>
            Criar e abrir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
