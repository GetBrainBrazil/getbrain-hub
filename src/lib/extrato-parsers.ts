// OFX and CSV parsers for bank statement import

export interface ExtratoTransaction {
  data: string; // YYYY-MM-DD
  descricao: string;
  valor: number;
  tipo: "entrada" | "saida";
}

/** Parse OFX 2.x (SGML-like format used by Brazilian banks) */
export function parseOFX(content: string): ExtratoTransaction[] {
  const transactions: ExtratoTransaction[] = [];

  // Extract all STMTTRN blocks
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;

  while ((match = trnRegex.exec(content)) !== null) {
    const block = match[1];

    const dtPosted = extractTag(block, "DTPOSTED");
    const trnAmt = extractTag(block, "TRNAMT");
    const name = extractTag(block, "NAME") || extractTag(block, "MEMO") || "";

    if (!dtPosted || !trnAmt) continue;

    const valor = parseFloat(trnAmt.replace(",", "."));
    const data = parseOFXDate(dtPosted);

    transactions.push({
      data,
      descricao: name.trim(),
      valor: Math.abs(valor),
      tipo: valor >= 0 ? "entrada" : "saida",
    });
  }

  return transactions.sort((a, b) => a.data.localeCompare(b.data));
}

function extractTag(block: string, tag: string): string | null {
  // Handle both <TAG>value</TAG> and <TAG>value\n formats (OFX SGML)
  const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i");
  const m = block.match(regex);
  return m ? m[1].trim() : null;
}

function parseOFXDate(dt: string): string {
  // OFX dates: YYYYMMDDHHMMSS or YYYYMMDD
  const y = dt.substring(0, 4);
  const m = dt.substring(4, 6);
  const d = dt.substring(6, 8);
  return `${y}-${m}-${d}`;
}

/** Parse CSV with auto-detection of separator and date format */
export function parseCSV(content: string): ExtratoTransaction[] {
  const lines = content.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Detect separator
  const sep = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ""));

  // Find column indices by common names
  const dateCol = findCol(header, ["data", "date", "dt", "data_transacao", "data transação"]);
  const descCol = findCol(header, ["descricao", "descrição", "desc", "historico", "histórico", "memo", "description"]);
  const valorCol = findCol(header, ["valor", "value", "amount", "vlr"]);
  const tipoCol = findCol(header, ["tipo", "type", "natureza"]);

  if (dateCol === -1 || valorCol === -1) {
    // Fallback: assume columns 0=date, 1=desc, 2=value
    return lines.slice(1).map(line => {
      const cols = parseCsvLine(line, sep);
      const valor = parseBRNumber(cols[2] || "0");
      return {
        data: parseFlexDate(cols[0] || ""),
        descricao: cols[1] || "",
        valor: Math.abs(valor),
        tipo: valor >= 0 ? "entrada" as const : "saida" as const,
      };
    }).filter(t => t.data);
  }

  return lines.slice(1).map(line => {
    const cols = parseCsvLine(line, sep);
    const valorRaw = parseBRNumber(cols[valorCol] || "0");
    let tipo: "entrada" | "saida" = valorRaw >= 0 ? "entrada" : "saida";

    if (tipoCol !== -1) {
      const t = (cols[tipoCol] || "").toLowerCase();
      if (t.includes("cred") || t.includes("entrada") || t.includes("receita")) tipo = "entrada";
      else if (t.includes("deb") || t.includes("saida") || t.includes("despesa")) tipo = "saida";
    }

    return {
      data: parseFlexDate(cols[dateCol] || ""),
      descricao: cols[descCol] || cols[1] || "",
      valor: Math.abs(valorRaw),
      tipo,
    };
  }).filter(t => t.data);
}

function findCol(header: string[], names: string[]): number {
  for (const n of names) {
    const idx = header.indexOf(n);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseCsvLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === sep && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseBRNumber(s: string): number {
  const cleaned = s.replace(/\s/g, "").replace("R$", "");
  // If has both , and .: determine which is decimal
  if (cleaned.includes(",") && cleaned.includes(".")) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
    }
    return parseFloat(cleaned.replace(/,/g, ""));
  }
  if (cleaned.includes(",")) {
    return parseFloat(cleaned.replace(",", "."));
  }
  return parseFloat(cleaned) || 0;
}

function parseFlexDate(s: string): string {
  const trimmed = s.trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const brMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
  }
  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  return "";
}

/** Detect file type from content */
export function detectFileType(content: string): "ofx" | "csv" | "unknown" {
  const trimmed = content.trim();
  if (trimmed.includes("<OFX>") || trimmed.includes("OFXHEADER") || trimmed.includes("<STMTTRN>")) {
    return "ofx";
  }
  const lines = trimmed.split(/\r?\n/);
  if (lines.length >= 2 && (lines[0].includes(",") || lines[0].includes(";"))) {
    return "csv";
  }
  return "unknown";
}
