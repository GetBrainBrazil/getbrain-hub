import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDealId?: string | null;
  defaultCompanyId?: string | null;
}

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export function NovoOrcamentoModal({
  open,
  onOpenChange,
  defaultDealId,
  defaultCompanyId,
}: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [companies, setCompanies] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string>(defaultCompanyId || "");
  const [dealId, setDealId] = useState<string>(defaultDealId || "__none__");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCompanyId(defaultCompanyId || "");
    setDealId(defaultDealId || "__none__");
    (async () => {
      const [c, d] = await Promise.all([
        supabase
          .from("companies")
          .select("id, trade_name, legal_name")
          .is("deleted_at", null)
          .order("legal_name"),
        supabase
          .from("deals")
          .select("id, code, title, stage, company_id")
          .is("deleted_at", null)
          .in("stage", [
            "descoberta_marcada",
            "descobrindo",
            "proposta_na_mesa",
            "ajustando",
          ])
          .order("created_at", { ascending: false }),
      ]);
      setCompanies(c.data || []);
      setDeals(d.data || []);
    })();
  }, [open, defaultDealId, defaultCompanyId]);

  // Quando deal é escolhido, sincroniza company
  useEffect(() => {
    if (dealId && dealId !== "__none__") {
      const d = deals.find((x) => x.id === dealId);
      if (d?.company_id) setCompanyId(d.company_id);
    }
  }, [dealId, deals]);

  async function handleCreate() {
    if (!companyId) {
      toast.error("Selecione uma empresa cliente");
      return;
    }
    setSubmitting(true);
    try {
      const co = companies.find((c) => c.id === companyId);
      const userRes = await supabase.auth.getUser();
      const uid = userRes.data.user?.id ?? null;
      const validUntil = new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from("proposals" as any)
        .insert({
          organization_id: ORG_ID,
          deal_id: dealId === "__none__" ? null : dealId,
          company_id: companyId,
          status: "rascunho",
          client_company_name: co?.trade_name || co?.legal_name || "",
          scope_items: [],
          valid_until: validUntil,
          created_by: uid,
          updated_by: uid,
        })
        .select("id")
        .single();
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["proposals_kpis"] });
      onOpenChange(false);
      navigate(`/financeiro/orcamentos/${(data as any).id}/editar`);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar orçamento");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Orçamento</DialogTitle>
          <DialogDescription>
            O orçamento começa como rascunho. Você poderá editar todo o
            conteúdo na próxima tela.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Vincular a um deal (opcional)</Label>
            <Select value={dealId} onValueChange={setDealId}>
              <SelectTrigger>
                <SelectValue placeholder="— Nenhum —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {deals.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.code} — {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Empresa cliente *</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.trade_name || c.legal_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Não encontrou? Cadastre primeiro em CRM → Empresas.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={submitting || !companyId}>
            {submitting ? "Criando…" : "Criar e editar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
