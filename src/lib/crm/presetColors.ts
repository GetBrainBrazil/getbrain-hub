// Paleta compartilhada de cores (design tokens) usada por chips de
// Tipo de projeto, Categorias da dor, Origens de lead, Papéis de contato, etc.
// Mantém UM ÚNICO source-of-truth para que o seletor nas configurações
// e a cor aleatória atribuída na criação fiquem sempre alinhados.

export type PresetColor = {
  label: string;
  /** Classes Tailwind aplicadas ao chip (bg + text + border) */
  value: string;
  /** Cor sólida para preview (swatch redondo) */
  preview: string;
};

export const PRESET_COLORS: PresetColor[] = [
  { label: "Cyan",   value: "bg-accent/15 text-accent border-accent/30",          preview: "hsl(var(--accent))" },
  { label: "Verde",  value: "bg-success/15 text-success border-success/30",       preview: "hsl(var(--success))" },
  { label: "Âmbar",  value: "bg-warning/15 text-warning border-warning/30",       preview: "hsl(var(--warning))" },
  { label: "Roxo",   value: "bg-chart-4/15 text-chart-4 border-chart-4/30",       preview: "hsl(var(--chart-4))" },
  { label: "Rosa",   value: "bg-chart-5/15 text-chart-5 border-chart-5/30",       preview: "hsl(var(--chart-5))" },
  { label: "Cinza",  value: "bg-muted text-muted-foreground border-border",       preview: "hsl(var(--muted-foreground))" },
];

/** Cores "vivas" (sem o cinza neutro) — usadas para sortear cor de novos itens. */
export const VIVID_PRESET_COLORS = PRESET_COLORS.filter((c) => c.label !== "Cinza");

/** Sorteia uma cor (token Tailwind) para um novo item. */
export function randomPresetColor(): string {
  const i = Math.floor(Math.random() * VIVID_PRESET_COLORS.length);
  return VIVID_PRESET_COLORS[i].value;
}

/** Resolve a cor de preview (swatch) a partir do token armazenado. */
export function colorPreviewFromToken(token: string | null | undefined): string {
  if (!token) return "hsl(var(--muted-foreground))";
  return PRESET_COLORS.find((c) => c.value === token)?.preview ?? "hsl(var(--muted-foreground))";
}
