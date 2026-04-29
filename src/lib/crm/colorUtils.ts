// Utilitários de cor para os pickers das configurações do CRM.
// A partir de agora, persistimos sempre HEX (#RRGGBB) na coluna `color`.
// Itens antigos que ainda guardam classes Tailwind (ex: "bg-accent/15 text-accent border-accent/30")
// são convertidos para HEX equivalente apenas para renderização (retro-compat).

/** Paleta de sugestões rápidas exibida abaixo do picker. */
export const SUGGESTED_HEX_PALETTE: string[] = [
  "#22D3EE", // cyan (accent)
  "#10B981", // verde (success)
  "#F59E0B", // âmbar (warning)
  "#EF4444", // vermelho
  "#A855F7", // roxo
  "#EC4899", // rosa
  "#6366F1", // índigo
  "#94A3B8", // cinza neutro
];

const VIVID = SUGGESTED_HEX_PALETTE.filter((h) => h !== "#94A3B8");

/** Sorteia uma cor vibrante (sem cinza) para novos itens. */
export function randomVividHex(): string {
  return VIVID[Math.floor(Math.random() * VIVID.length)];
}

/** Mapeia tokens Tailwind legados → HEX equivalente. */
const TOKEN_TO_HEX: Array<{ match: RegExp; hex: string }> = [
  { match: /bg-accent\b/, hex: "#22D3EE" },
  { match: /bg-success\b/, hex: "#10B981" },
  { match: /bg-warning\b/, hex: "#F59E0B" },
  { match: /bg-chart-4\b/, hex: "#A855F7" },
  { match: /bg-chart-5\b/, hex: "#EC4899" },
  { match: /bg-muted\b/, hex: "#94A3B8" },
];

/** Aceita HEX direto, classe Tailwind legada ou null e devolve sempre HEX válido. */
export function resolveHex(value: string | null | undefined, fallback = "#94A3B8"): string {
  if (!value) return fallback;
  const v = value.trim();
  if (isValidHex(v)) return normalizeHex(v);
  for (const { match, hex } of TOKEN_TO_HEX) if (match.test(v)) return hex;
  return fallback;
}

/** Valida #RGB ou #RRGGBB. */
export function isValidHex(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim());
}

/** Garante formato #RRGGBB em maiúsculas. */
export function normalizeHex(hex: string): string {
  let h = hex.trim().toUpperCase();
  if (/^#[0-9A-F]{3}$/.test(h)) {
    h = "#" + h.slice(1).split("").map((c) => c + c).join("");
  }
  return h;
}

/** Converte HEX em rgba(r,g,b,alpha). */
export function hexToRgba(hex: string, alpha = 1): string {
  const h = resolveHex(hex);
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Estilo pronto para chips: bg suave + texto colorido + borda translúcida. */
export function chipStyleFromHex(value: string | null | undefined): React.CSSProperties {
  const hex = resolveHex(value);
  return {
    backgroundColor: hexToRgba(hex, 0.15),
    color: hex,
    borderColor: hexToRgba(hex, 0.35),
  };
}

// Pequeno re-export pra evitar import do React aqui.
import type * as React from "react";
