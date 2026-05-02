/**
 * Painel: Títulos das seções. Cada seção da página pública tem um par
 * (eyebrow + título). Renderizamos um card por seção com mini-preview.
 */
import { PainelHeader, CommitInput } from "./ui";
import type { PainelProps } from "./types";

const SECTIONS = [
  { key: "carta", label: "Abertura", desc: "Carta de apresentação no início." },
  { key: "contexto", label: "Contexto", desc: "Apresentação da dor e do cenário." },
  { key: "solucao", label: "Solução", desc: "A proposta de solução." },
  { key: "escopo", label: "Escopo", desc: "Lista do que será construído." },
  { key: "investimento", label: "Investimento", desc: "Bloco financeiro." },
  { key: "cronograma", label: "Cronograma", desc: "Roadmap em fases." },
  { key: "sobre", label: "Sobre", desc: "Sobre a GetBrain." },
  { key: "proximos", label: "Próximos passos", desc: "CTA final." },
];

export function PainelSecoes({ settings, persist }: PainelProps) {
  const updateMap = (kind: "section_eyebrows" | "section_titles", key: string, value: string) => {
    const next = { ...(settings[kind] as Record<string, string>), [key]: value };
    persist(kind, next as any);
  };

  return (
    <div>
      <PainelHeader
        icon="Type"
        title="Títulos das seções"
        description="Eyebrow (pequena etiqueta) e título principal de cada bloco da página pública."
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {SECTIONS.map((s) => {
          const eb = (settings.section_eyebrows as any)[s.key] ?? "";
          const tt = (settings.section_titles as any)[s.key] ?? "";
          return (
            <div
              key={s.key}
              className="rounded-lg border border-border bg-card p-4 space-y-3 hover:border-border/80 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground">{s.label}</div>
                  <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                </div>
              </div>

              {/* Mini preview */}
              <div className="rounded-md bg-muted/40 px-3 py-2.5 border border-dashed border-border/60">
                <div className="text-[10px] uppercase tracking-[0.18em] text-accent font-mono">
                  {eb || "eyebrow"}
                </div>
                <div className="text-sm font-semibold text-foreground mt-0.5 leading-tight">
                  {tt || "título da seção"}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
                <CommitInput
                  value={eb}
                  onCommit={(v) => updateMap("section_eyebrows", s.key, v)}
                  placeholder="Eyebrow"
                />
                <CommitInput
                  value={tt}
                  onCommit={(v) => updateMap("section_titles", s.key, v)}
                  placeholder="Título"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
