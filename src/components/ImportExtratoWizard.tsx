import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { parseOFX, parseCSV, detectFileType, type ExtratoTransaction } from "@/lib/extrato-parsers";
import { matchTransactions, type MatchResult, type MatchedMov } from "@/lib/conciliacao-matcher";
import { Upload, Check, AlertTriangle, HelpCircle, ChevronLeft, ChevronRight, FileUp, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contas: { id: string; nome: string; banco?: string | null }[];
}

const STEPS = ["Upload", "Pré-visualização", "Matching", "Confirmação"];

export function ImportExtratoWizard({ open, onOpenChange, contas }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [contaId, setContaId] = useState("");
  const [fileName, setFileName] = useState("");
  const [transactions, setTransactions] = useState<(ExtratoTransaction & { tempId: string })[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [confirmed, setConfirmed] = useState<Map<string, boolean>>(new Map());
  const [selectedMatch, setSelectedMatch] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setStep(0);
    setContaId("");
    setFileName("");
    setTransactions([]);
    setMatchResults([]);
    setConfirmed(new Map());
    setSelectedMatch(new Map());
  }, []);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const type = detectFileType(content);
      let txns: ExtratoTransaction[] = [];
      if (type === "ofx") txns = parseOFX(content);
      else if (type === "csv") txns = parseCSV(content);
      else {
        toast.error("Formato de arquivo não reconhecido. Use OFX ou CSV.");
        return;
      }
      if (txns.length === 0) {
        toast.error("Nenhuma transação encontrada no arquivo.");
        return;
      }
      const withIds = txns.map((t, i) => ({ ...t, tempId: `tmp-${i}` }));
      setTransactions(withIds);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const input = document.createElement("input");
    input.type = "file";
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handleFileUpload({ target: input } as any);
  };

  const goToPreview = () => {
    if (!contaId) { toast.error("Selecione a conta bancária."); return; }
    if (transactions.length === 0) { toast.error("Faça upload de um arquivo."); return; }
    setStep(1);
  };

  const goToMatching = async () => {
    setLoading(true);
    try {
      // Fetch paid movimentações for the selected account
      const minDate = transactions.reduce((min, t) => t.data < min ? t.data : min, transactions[0].data);
      const maxDate = transactions.reduce((max, t) => t.data > max ? t.data : max, transactions[0].data);
      // Expand date range for matching tolerance
      const start = new Date(minDate);
      start.setDate(start.getDate() - 7);
      const end = new Date(maxDate);
      end.setDate(end.getDate() + 7);

      const { data: movs } = await supabase
        .from("movimentacoes")
        .select("id, descricao, valor_realizado, valor_previsto, data_pagamento, data_vencimento, tipo, categorias(nome)")
        .eq("conta_bancaria_id", contaId)
        .eq("status", "pago")
        .gte("data_pagamento", start.toISOString().split("T")[0])
        .lte("data_pagamento", end.toISOString().split("T")[0]);

      const movsForMatch: MatchedMov[] = (movs || []).map((m: any) => ({
        id: m.id,
        descricao: m.descricao,
        valor: m.valor_realizado ?? m.valor_previsto ?? 0,
        data_pagamento: m.data_pagamento,
        data_vencimento: m.data_vencimento,
        tipo: m.tipo,
        categoria_nome: m.categorias?.nome,
      }));

      const results = matchTransactions(transactions, movsForMatch);
      setMatchResults(results);

      // Pre-set confirmed for high matches
      const conf = new Map<string, boolean>();
      const sel = new Map<string, string | null>();
      results.forEach(r => {
        if (r.confidence === "alto") {
          conf.set(r.extrato.tempId, true);
          sel.set(r.extrato.tempId, r.matchedMov?.id ?? null);
        } else if (r.confidence === "medio") {
          conf.set(r.extrato.tempId, false);
          sel.set(r.extrato.tempId, r.matchedMov?.id ?? null);
        }
      });
      setConfirmed(conf);
      setSelectedMatch(sel);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const minDate = transactions.reduce((min, t) => t.data < min ? t.data : min, transactions[0].data);
      const maxDate = transactions.reduce((max, t) => t.data > max ? t.data : max, transactions[0].data);

      // Create importacao record
      const conciliadoCount = matchResults.filter(r => confirmed.get(r.extrato.tempId)).length;
      const { data: imp } = await supabase.from("extrato_importacoes").insert({
        conta_bancaria_id: contaId,
        data_inicio: minDate,
        data_fim: maxDate,
        nome_arquivo: fileName,
        total_transacoes: transactions.length,
        transacoes_conciliadas: conciliadoCount,
        transacoes_criadas: 0,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      }).select("id").single();

      if (!imp) throw new Error("Falha ao criar importação");

      // Insert extrato_transacoes and update movimentacoes
      for (const r of matchResults) {
        const isConfirmed = confirmed.get(r.extrato.tempId) === true;
        const matchId = isConfirmed ? (selectedMatch.get(r.extrato.tempId) ?? null) : null;

        await supabase.from("extrato_transacoes").insert({
          importacao_id: imp.id,
          conta_bancaria_id: contaId,
          data_transacao: r.extrato.data,
          descricao_banco: r.extrato.descricao,
          valor: r.extrato.valor,
          tipo: r.extrato.tipo,
          status_match: isConfirmed ? "conciliado" : r.confidence,
          movimentacao_id: matchId,
          conciliado: isConfirmed,
        });

        if (isConfirmed && matchId) {
          await supabase.from("movimentacoes").update({ conciliado: true }).eq("id", matchId);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["extrato_movimentacoes"] });
      queryClient.invalidateQueries({ queryKey: ["extrato_transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["extrato_importacoes"] });
      queryClient.invalidateQueries({ queryKey: ["conciliacao_stats"] });

      toast.success(`Conciliação concluída: ${conciliadoCount} transações conciliadas.`);
      handleClose();
    } catch (err: any) {
      toast.error("Erro ao confirmar conciliação: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const altoCount = matchResults.filter(r => r.confidence === "alto").length;
  const medioCount = matchResults.filter(r => r.confidence === "medio").length;
  const semMatchCount = matchResults.filter(r => r.confidence === "sem_match").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Extrato Bancário</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                i < step ? "bg-success text-success-foreground" :
                i === step ? "bg-accent text-accent-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-sm ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 0: Upload */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label>Qual conta este extrato pertence?</Label>
              <Select value={contaId} onValueChange={setContaId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {contas.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome} {c.banco ? `(${c.banco})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-accent transition-colors"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById("extrato-file-input")?.click()}
            >
              <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">{fileName || "Arraste o arquivo do extrato aqui ou clique para selecionar"}</p>
              <p className="text-sm text-muted-foreground mt-1">Formatos aceitos: OFX, CSV</p>
              {transactions.length > 0 && (
                <Badge variant="secondary" className="mt-2">{transactions.length} transações encontradas</Badge>
              )}
              <input id="extrato-file-input" type="file" accept=".ofx,.csv" className="hidden" onChange={handleFileUpload} />
            </div>

            <div className="flex justify-end">
              <Button onClick={goToPreview} disabled={!contaId || transactions.length === 0}>
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Preview */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Encontradas <strong>{transactions.length}</strong> transações entre{" "}
              <strong>{formatDate(transactions[0].data)}</strong> e{" "}
              <strong>{formatDate(transactions[transactions.length - 1].data)}</strong>.
            </p>

            <div className="rounded-lg border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(t => (
                    <TableRow key={t.tempId}>
                      <TableCell className="font-mono text-sm">{formatDate(t.data)}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{t.descricao}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(t.valor)}</TableCell>
                      <TableCell>
                        <Badge variant={t.tipo === "entrada" ? "default" : "destructive"} className={t.tipo === "entrada" ? "bg-success/15 text-success border-success/20" : ""}>
                          {t.tipo === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={goToMatching} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Processar Conciliação <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Matching results */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Badge className="bg-success/15 text-success border-success/20 gap-1"><Check className="h-3 w-3" /> {altoCount} conciliados automaticamente</Badge>
              <Badge className="bg-warning/15 text-warning border-warning/20 gap-1"><HelpCircle className="h-3 w-3" /> {medioCount} aguardando confirmação</Badge>
              <Badge className="bg-destructive/15 text-destructive border-destructive/20 gap-1"><AlertTriangle className="h-3 w-3" /> {semMatchCount} sem correspondência</Badge>
            </div>

            <div className="rounded-lg border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição no Extrato</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lançamento Correspondente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchResults.map(r => {
                    const isChecked = confirmed.get(r.extrato.tempId) === true;
                    return (
                      <TableRow key={r.extrato.tempId}>
                        <TableCell>
                          {r.confidence !== "sem_match" && (
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={v => setConfirmed(new Map(confirmed.set(r.extrato.tempId, !!v)))}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{formatDate(r.extrato.data)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.extrato.descricao}</TableCell>
                        <TableCell className={`text-right font-mono ${r.extrato.tipo === "entrada" ? "text-success" : "text-destructive"}`}>
                          {formatCurrency(r.extrato.valor)}
                        </TableCell>
                        <TableCell>
                          {r.confidence === "alto" && <Badge className="bg-success/15 text-success border-success/20 gap-1"><Check className="h-3 w-3" />Alto</Badge>}
                          {r.confidence === "medio" && <Badge className="bg-warning/15 text-warning border-warning/20 gap-1"><HelpCircle className="h-3 w-3" />Médio</Badge>}
                          {r.confidence === "sem_match" && <Badge className="bg-destructive/15 text-destructive border-destructive/20 gap-1"><AlertTriangle className="h-3 w-3" />Sem match</Badge>}
                        </TableCell>
                        <TableCell>
                          {r.confidence !== "sem_match" && r.alternativas.length > 0 ? (
                            <Select
                              value={selectedMatch.get(r.extrato.tempId) ?? ""}
                              onValueChange={v => {
                                setSelectedMatch(new Map(selectedMatch.set(r.extrato.tempId, v || null)));
                                if (v) setConfirmed(new Map(confirmed.set(r.extrato.tempId, true)));
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs w-[220px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                {r.alternativas.map(a => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.descricao.substring(0, 30)} — {formatCurrency(a.valor)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={handleConfirm} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Confirmar Conciliação
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
