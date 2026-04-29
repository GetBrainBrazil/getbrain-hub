import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ComboboxCreate } from '@/components/crm/ComboboxCreate';
import { useCreateDeal, useDeals } from '@/hooks/crm/useDeals';
import { useCompanies, useCreateCompany } from '@/hooks/crm/useCrmReference';
import { DEAL_STAGE_LABEL } from '@/constants/dealStages';
import type { DealStage } from '@/types/crm';

/**
 * Mini-dialog para criar um Deal direto no pipeline. Pede só a empresa
 * (com criação inline), cria o deal na coluna desejada e navega para a
 * ficha em modo de edição. Todos os outros campos são editados inline lá.
 */
export function NewDealQuickDialog({
  open,
  onOpenChange,
  initialStage = 'descoberta_marcada',
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialStage?: DealStage;
}) {
  const navigate = useNavigate();
  const { data: companies = [] } = useCompanies();
  const { data: allDeals = [] } = useDeals();
  const createDeal = useCreateDeal();
  const createCompany = useCreateCompany();

  const [companyId, setCompanyId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setCompanyId('');
      setSubmitting(false);
    }
  }, [open]);

  const company = companies.find((c) => c.id === companyId);
  const companyLabel = company?.trade_name || company?.legal_name || '';

  const openDealForCompany = companyId
    ? allDeals.find(
        (d) =>
          d.company_id === companyId &&
          !['ganho', 'perdido'].includes(d.stage),
      )
    : null;

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
    createDeal.mutate(
      {
        title: `Novo deal — ${companyLabel || 'sem título'}`,
        company_id: companyId,
        stage: initialStage,
      },
      {
        onSuccess: (deal) => {
          toast.success(`Deal ${deal.code} criado em ${DEAL_STAGE_LABEL[initialStage]}`);
          onOpenChange(false);
          navigate(`/crm/deals/${deal.code}`);
        },
        onError: (e: any) => {
          toast.error(e?.message ?? 'Erro ao criar deal');
          setSubmitting(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Deal</DialogTitle>
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
              O card será criado na coluna <span className="font-medium text-foreground">{DEAL_STAGE_LABEL[initialStage]}</span>.
              Você completa título, valor, contato e tudo mais na ficha do deal.
            </p>
          </div>

          {openDealForCompany && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
              <p className="font-medium text-warning">
                Esta empresa já tem um deal aberto:{' '}
                <span className="font-mono">{openDealForCompany.code}</span> — "{openDealForCompany.title}"
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/crm/deals/${openDealForCompany.code}`);
                }}
              >
                Abrir deal existente
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!companyId || submitting || createDeal.isPending}>
            Criar e abrir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
