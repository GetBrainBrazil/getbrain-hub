// Matching logic for bank reconciliation
import type { ExtratoTransaction } from "./extrato-parsers";

export interface MatchResult {
  extrato: ExtratoTransaction & { tempId: string };
  confidence: "alto" | "medio" | "sem_match";
  matchedMov: MatchedMov | null;
  alternativas: MatchedMov[];
}

export interface MatchedMov {
  id: string;
  descricao: string;
  valor: number;
  data_pagamento: string | null;
  data_vencimento: string;
  tipo: string;
  categoria_nome?: string;
}

function daysDiff(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.abs(Math.round((da.getTime() - db.getTime()) / 86400000));
}

function normalizeStr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}

function wordSimilarity(a: string, b: string): number {
  const wa = new Set(normalizeStr(a).split(/\s+/));
  const wb = new Set(normalizeStr(b).split(/\s+/));
  if (wa.size === 0 || wb.size === 0) return 0;
  let common = 0;
  for (const w of wa) { if (wb.has(w)) common++; }
  return common / Math.max(wa.size, wb.size);
}

export function matchTransactions(
  extratoTxns: (ExtratoTransaction & { tempId: string })[],
  movimentacoes: MatchedMov[]
): MatchResult[] {
  const usedMovIds = new Set<string>();

  return extratoTxns.map(ext => {
    // Find candidates: same absolute value, same type direction
    const tipoMatch = ext.tipo === "entrada" ? "receita" : "despesa";
    const candidates = movimentacoes
      .filter(m => !usedMovIds.has(m.id) && m.tipo === tipoMatch && Math.abs(m.valor - ext.valor) < 0.01)
      .map(m => {
        const dateRef = m.data_pagamento || m.data_vencimento;
        const days = daysDiff(ext.data, dateRef);
        const sim = wordSimilarity(ext.descricao, m.descricao);
        return { mov: m, days, sim };
      })
      .sort((a, b) => a.days - b.days || b.sim - a.sim);

    if (candidates.length === 0) {
      return { extrato: ext, confidence: "sem_match" as const, matchedMov: null, alternativas: [] };
    }

    const best = candidates[0];
    let confidence: "alto" | "medio" | "sem_match";

    if (best.days <= 2 && best.sim >= 0.2) {
      confidence = "alto";
    } else if (best.days <= 5) {
      confidence = "medio";
    } else {
      confidence = "sem_match";
    }

    if (confidence !== "sem_match") {
      usedMovIds.add(best.mov.id);
    }

    return {
      extrato: ext,
      confidence,
      matchedMov: confidence !== "sem_match" ? best.mov : null,
      alternativas: candidates.slice(0, 4).map(c => c.mov),
    };
  });
}
