import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PreviewParcelas } from "./PreviewParcelas";
import { FREQ_LABEL, type Frequency } from "@/lib/recorrencias/preview";
import { z } from "zod";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultProjectId?: string | null;
}

const schema = z
  .object({
    type: z.enum(["recurrence", "installment"]),
    direction: z.enum(["receita", "despesa"]),
    description: z.string().min(3, "Mínimo 3 caracteres").max(200),
    amount: z.number().positive("Valor deve ser positivo"),
    frequency: z.enum(["mensal", "bimestral", "trimestral", "semestral", "anual"]),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    end_date: z.string().optional().nullable(),
    total_installments: z.number().int().positive().optional().nullable(),
    cliente_id: z.string().uuid().optional().nullable(),
    fornecedor_id: z.string().uuid().optional().nullable(),
    projeto_id: z.string().uuid().optional().nullable(),
    categoria_id: z.string().uuid().optional().nullable(),
    centro_custo_id: z.string().uuid().optional().nullable(),
    conta_bancaria_id: z.string().uuid().optional().nullable(),
    meio_pagamento_id: z.string().uuid().optional().nullable(),
  })
  .refine((d) => d.type !== "installment" || (d.total_installments && d.total_installments > 0), {
    message: "Parcelamento exige total de parcelas",
    path: ["total_installments"],
  })
  .refine((d) => !(d.direction === "receita" && d.fornecedor_id), {
    message: "Receita não pode ter fornecedor",
    path: ["fornecedor_id"],
  })
  .refine((d) => !(d.direction === "despesa" && d.cliente_id), {
    message: "Despesa não pode ter cliente",
    path: ["cliente_id"],
  });

type FormState = z.input<typeof schema>;

const today = () => new Date().toISOString().slice(0, 10);

export function NovaRecorrenciaModal({ open, onOpenChange, defaultProjectId }: Props) {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [refs, setRefs] = useState<{
    clientes: any[]; fornecedores: any[]; projetos: any[]; categorias: any[]; centros: any[]; contas: any[]; meios: any[];
  }>({ clientes: [], fornecedores: [], projetos: [], categorias: [], centros: [], contas: [], meios: [] });

  const [form, setForm] = useState<FormState>({
    type: "recurrence",
    direction: "despesa",
    description: "",
    amount: 0,
    frequency: "mensal",
    start_date: today(),
    end_date: null,
    total_installments: null,
    cliente_id: null,
    fornecedor_id: null,
    projeto_id: defaultProjectId ?? null,
    categoria_id: null,
    centro_custo_id: null,
    conta_bancaria_id: null,
    meio_pagamento_id: null,
  });
  const [endMode, setEndMode] = useState<"open" | "withEnd">("open");
  const [amountStr, setAmountStr] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [c, f, p, cat, cc, cb, mp] = await Promise.all([
        supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("projects").select("id, code, name").is("deleted_at", null).order("name"),
        supabase.from("categorias").select("id, nome, tipo").eq("ativo", true).order("nome"),
        supabase.from("centros_custo").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("contas_bancarias").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("meios_pagamento").select("id, nome").eq("ativo", true).order("nome"),
      ]);
      setRefs({
        clientes: c.data || [], fornecedores: f.data || [], projetos: p.data || [],
        categorias: cat.data || [], centros: cc.data || [], contas: cb.data || [], meios: mp.data || [],
      });
    })();
  }, [open]);

  const filteredCategorias = useMemo(
    () => refs.categorias.filter((c: any) =>
      form.direction === "receita" ? c.tipo === "receita" : c.tipo !== "receita"
    ),
    [refs.categorias, form.direction]
  );

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k as string]: "" }));
  }

  async function handleSubmit() {
    const payload = {
      ...form,
      amount: Number(form.amount),
      end_date: endMode === "withEnd" ? form.end_date || null : null,
      total_installments: form.type === "installment" ? Number(form.total_installments) : null,
      // limpar campos de direção oposta
      cliente_id: form.direction === "receita" ? form.cliente_id : null,
      fornecedor_id: form.direction === "despesa" ? form.fornecedor_id : null,
    };

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((e) => { errs[e.path.join(".")] = e.message; });
      setErrors(errs);
      toast.error("Verifique os campos do formulário");
      return;
    }

    setSubmitting(true);
    try {
      const horizon = form.type === "installment" ? Number(form.total_installments) : 12;
      const { error } = await supabase.rpc("create_recurrence_with_installments" as any, {
        p_payload: { ...parsed.data, source_module: "manual_recurrence" },
        p_horizon_months: horizon,
      });
      if (error) throw error;
      toast.success("Recorrência criada com sucesso");
      qc.invalidateQueries({ queryKey: ["financial_recurrences"] });
      qc.invalidateQueries({ queryKey: ["financial_recurrences_kpis"] });
      invalidateFinanceCaches(qc, { projectId: (parsed.data as any).projeto_id || null });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar recorrência");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Recorrência</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo */}
          <div>
            <Label className="text-xs">Tipo</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(["recurrence", "installment"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update("type", t)}
                  className={`rounded-md border-2 p-3 text-left text-sm transition ${
                    form.type === t ? "border-primary bg-primary/10" : "border-border bg-background hover:border-muted-foreground/40"
                  }`}
                >
                  <div className="font-semibold">{t === "recurrence" ? "Recorrência contínua" : "Parcelamento finito"}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {t === "recurrence" ? "Sem fim definido (ou com prazo)" : "Total de parcelas conhecido"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Direção</Label>
              <Select value={form.direction} onValueChange={(v) => update("direction", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Frequência</Label>
              <Select value={form.frequency} onValueChange={(v) => update("frequency", v as Frequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQ_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Descrição *</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => update("description", e.target.value)} />
            {errors["description"] && <p className="text-xs text-destructive mt-1">{errors["description"]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Valor *</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={amountStr}
                placeholder="0,00"
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d,.-]/g, "");
                  setAmountStr(raw);
                  const num = Number(raw.replace(/\./g, "").replace(",", "."));
                  update("amount", isNaN(num) ? 0 : num);
                }}
              />
              {errors["amount"] && <p className="text-xs text-destructive mt-1">{errors["amount"]}</p>}
            </div>
            <div>
              <Label className="text-xs">Início *</Label>
              <Input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} />
            </div>
          </div>

          {form.type === "recurrence" && (
            <div className="rounded-md border border-border p-3 space-y-2">
              <Label className="text-xs">Duração</Label>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={endMode === "open"} onChange={() => setEndMode("open")} />
                  Sem prazo (12 meses rolling)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={endMode === "withEnd"} onChange={() => setEndMode("withEnd")} />
                  Com prazo
                </label>
              </div>
              {endMode === "withEnd" && (
                <Input type="date" value={form.end_date || ""} onChange={(e) => update("end_date", e.target.value)} />
              )}
            </div>
          )}

          {form.type === "installment" && (
            <div>
              <Label className="text-xs">Total de parcelas *</Label>
              <Input
                type="number"
                min={1}
                value={form.total_installments ?? ""}
                onChange={(e) => update("total_installments", e.target.value ? Number(e.target.value) : null)}
              />
              {errors["total_installments"] && <p className="text-xs text-destructive mt-1">{errors["total_installments"]}</p>}
            </div>
          )}

          {/* Vínculos */}
          <details className="rounded-md border border-border p-3" open>
            <summary className="text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer">Vínculos (opcional)</summary>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {form.direction === "receita" && (
                <RefSelect label="Cliente" value={form.cliente_id} onChange={(v) => update("cliente_id", v)} options={refs.clientes} />
              )}
              {form.direction === "despesa" && (
                <RefSelect label="Fornecedor" value={form.fornecedor_id} onChange={(v) => update("fornecedor_id", v)} options={refs.fornecedores} />
              )}
              <RefSelect label="Projeto" value={form.projeto_id} onChange={(v) => update("projeto_id", v)} options={refs.projetos.map((p: any) => ({ id: p.id, nome: `${p.code} — ${p.name}` }))} />
              <RefSelect label="Categoria" value={form.categoria_id} onChange={(v) => update("categoria_id", v)} options={filteredCategorias} />
              <RefSelect label="Centro de custo" value={form.centro_custo_id} onChange={(v) => update("centro_custo_id", v)} options={refs.centros} />
              <RefSelect label="Conta bancária" value={form.conta_bancaria_id} onChange={(v) => update("conta_bancaria_id", v)} options={refs.contas} />
              <RefSelect label="Meio de pagamento" value={form.meio_pagamento_id} onChange={(v) => update("meio_pagamento_id", v)} options={refs.meios} />
            </div>
          </details>

          <PreviewParcelas
            type={form.type}
            startDate={form.start_date}
            amount={Number(form.amount) || 0}
            frequency={form.frequency}
            totalInstallments={form.total_installments ?? null}
            endDate={endMode === "withEnd" ? form.end_date ?? null : null}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Criando..." : "Criar Recorrência"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefSelect({
  label, value, onChange, options,
}: {
  label: string; value: string | null | undefined;
  onChange: (v: string | null) => void;
  options: { id: string; nome: string }[];
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? null : v)}>
        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— Nenhum —</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
