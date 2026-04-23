import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCreateVenda, TipoVenda } from "@/hooks/useVendas";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { TIPO_VENDA_LABEL } from "@/lib/vendas-helpers";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultProjectId?: string;
}

export function NovaVendaDialog({ open, onOpenChange, defaultProjectId }: Props) {
  const [step, setStep] = useState(1);
  const [tipo, setTipo] = useState<TipoVenda>("implementacao");
  const [projectId, setProjectId] = useState<string>(defaultProjectId || "");
  const [descricao, setDescricao] = useState("");
  const [valorTotal, setValorTotal] = useState<string>("");
  const [qtdParcelas, setQtdParcelas] = useState<string>("1");
  const [dataVenda, setDataVenda] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dataPrimeira, setDataPrimeira] = useState(format(new Date(), "yyyy-MM-dd"));
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [centroCustoId, setCentroCustoId] = useState<string>("");
  const [contaId, setContaId] = useState<string>("");
  const [meioId, setMeioId] = useState<string>("");
  const [contractId, setContractId] = useState<string>("");

  const create = useCreateVenda();

  useEffect(() => {
    if (open) {
      setStep(1);
      setTipo("implementacao");
      setProjectId(defaultProjectId || "");
      setDescricao("");
      setValorTotal("");
      setQtdParcelas("1");
      setDataVenda(format(new Date(), "yyyy-MM-dd"));
      setDataPrimeira(format(new Date(), "yyyy-MM-dd"));
      setCategoriaId("");
      setCentroCustoId("");
      setContaId("");
      setMeioId("");
      setContractId("");
    }
  }, [open, defaultProjectId]);

  const { data: projects } = useQuery({
    queryKey: ["projects-list-vendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, code, name, company_id")
        .is("deleted_at", null)
        .order("code");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const selectedProject = projects?.find((p) => p.id === projectId);

  const { data: clienteFromProject } = useQuery({
    queryKey: ["cliente-from-project", selectedProject?.company_id],
    enabled: !!selectedProject?.company_id,
    queryFn: async () => {
      const { data: company } = await supabase
        .from("companies")
        .select("legal_name, trade_name")
        .eq("id", selectedProject!.company_id)
        .maybeSingle();
      if (!company) return null;
      const search = company.trade_name || company.legal_name;
      const { data: cliente } = await supabase
        .from("clientes")
        .select("id, nome")
        .or(`nome.ilike.%${search}%,nome_empresa.ilike.%${search}%`)
        .limit(1)
        .maybeSingle();
      return cliente;
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ["categorias-receita"],
    queryFn: async () => {
      const { data } = await supabase.from("categorias").select("id, nome").eq("tipo", "receita").eq("ativo", true).order("nome");
      return data || [];
    },
    enabled: open,
  });
  const { data: centros } = useQuery({
    queryKey: ["centros-custo-list"],
    queryFn: async () => {
      const { data } = await supabase.from("centros_custo").select("id, nome").eq("ativo", true).order("nome");
      return data || [];
    },
    enabled: open,
  });
  const { data: contas } = useQuery({
    queryKey: ["contas-bancarias-list"],
    queryFn: async () => {
      const { data } = await supabase.from("contas_bancarias").select("id, nome").eq("ativo", true).order("nome");
      return data || [];
    },
    enabled: open,
  });
  const { data: meios } = useQuery({
    queryKey: ["meios-pagamento-list"],
    queryFn: async () => {
      const { data } = await supabase.from("meios_pagamento").select("id, nome").eq("ativo", true).order("nome");
      return data || [];
    },
    enabled: open,
  });
  const { data: contratos } = useQuery({
    queryKey: ["maintenance-contracts", projectId],
    enabled: open && tipo === "recorrente" && !!projectId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("maintenance_contracts")
        .select("id, monthly_fee, status, start_date")
        .eq("project_id", projectId)
        .is("deleted_at", null);
      return data || [];
    },
  });

  const valorNum = Number(valorTotal.replace(",", ".") || 0);
  const qtdNum = Math.max(1, Number(qtdParcelas || 1));
  const valorParcela = useMemo(() => (qtdNum > 0 ? valorNum / qtdNum : 0), [valorNum, qtdNum]);

  const canNextFromStep1 = !!tipo && !!projectId;
  const canSubmit = useMemo(() => {
    if (!projectId) return false;
    if (tipo === "implementacao") return valorNum > 0 && qtdNum >= 1 && !!dataPrimeira;
    if (tipo === "avulso") return valorNum > 0 && !!dataPrimeira;
    if (tipo === "recorrente") return !!contractId;
    return false;
  }, [tipo, projectId, valorNum, qtdNum, dataPrimeira, contractId]);

  async function handleSubmit(confirm: boolean) {
    await create.mutateAsync({
      project_id: projectId,
      cliente_id: clienteFromProject?.id || null,
      tipo_venda: tipo,
      descricao: descricao || null,
      valor_total: tipo === "recorrente" ? 0 : valorNum,
      quantidade_parcelas: tipo === "implementacao" ? qtdNum : 1,
      data_venda: dataVenda,
      data_primeira_parcela: dataPrimeira,
      categoria_id: categoriaId || null,
      centro_custo_id: centroCustoId || null,
      conta_bancaria_id: contaId || null,
      meio_pagamento_id: meioId || null,
      maintenance_contract_id: tipo === "recorrente" ? contractId : null,
      confirm,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Venda — Etapa {step} de 3</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Tipo de venda</Label>
              <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as TipoVenda)} className="grid grid-cols-3 gap-2 mt-2">
                {(["implementacao", "recorrente", "avulso"] as TipoVenda[]).map((t) => (
                  <label key={t} className="flex items-center gap-2 border border-border rounded-md p-3 cursor-pointer hover:bg-muted/40">
                    <RadioGroupItem value={t} id={`tipo-${t}`} />
                    <span className="text-sm">{TIPO_VENDA_LABEL[t]}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label>Projeto</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                <SelectContent>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {projectId && (
              <div className="text-sm text-muted-foreground">
                Cliente: <span className="text-foreground font-medium">{clienteFromProject?.nome || "—"}</span>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {tipo === "implementacao" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor total (R$)</Label>
                    <Input type="number" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
                  </div>
                  <div>
                    <Label>Quantidade de parcelas</Label>
                    <Input type="number" min={1} value={qtdParcelas} onChange={(e) => setQtdParcelas(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Data da venda</Label>
                    <Input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} />
                  </div>
                  <div>
                    <Label>Data 1ª parcela</Label>
                    <Input type="date" value={dataPrimeira} onChange={(e) => setDataPrimeira(e.target.value)} />
                  </div>
                </div>
                {valorNum > 0 && qtdNum > 0 && (
                  <div className="text-sm bg-muted/40 rounded-md p-3">
                    Preview: <span className="font-semibold">{qtdNum}x {formatCurrency(valorParcela)}</span> mensais a partir de {dataPrimeira}
                  </div>
                )}
              </>
            )}

            {tipo === "avulso" && (
              <>
                <div>
                  <Label>Descrição</Label>
                  <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Hora extra, módulo adicional..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
                  </div>
                  <div>
                    <Label>Vencimento</Label>
                    <Input type="date" value={dataPrimeira} onChange={(e) => setDataPrimeira(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {tipo === "recorrente" && (
              <div>
                <Label>Contrato de manutenção</Label>
                <Select value={contractId} onValueChange={setContractId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um contrato" /></SelectTrigger>
                  <SelectContent>
                    {contratos?.length === 0 && (
                      <SelectItem value="__none" disabled>Nenhum contrato encontrado para este projeto</SelectItem>
                    )}
                    {contratos?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {formatCurrency(Number(c.monthly_fee))}/mês — desde {c.start_date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Vendas recorrentes não geram parcelas — elas são geradas pelo contrato de manutenção.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categorias?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Centro de custo</Label>
                <Select value={centroCustoId} onValueChange={setCentroCustoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {centros?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Conta bancária</Label>
                <Select value={contaId} onValueChange={setContaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {contas?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Meio de pagamento</Label>
                <Select value={meioId} onValueChange={setMeioId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {meios?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional" rows={3} />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button>}
          {step < 3 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !canNextFromStep1) || (step === 2 && !canSubmit)}
            >
              Próximo
            </Button>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => handleSubmit(false)} disabled={!canSubmit || create.isPending}>
                Salvar como rascunho
              </Button>
              <Button onClick={() => handleSubmit(true)} disabled={!canSubmit || create.isPending}>
                Confirmar venda
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
