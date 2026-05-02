/**
 * Editor para os pares (eyebrow + title) das seções da página pública.
 * Exibe linhas em grid 2 colunas, autosave on blur.
 */
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface SectionDef {
  key: string;
  label: string;
}

interface Props {
  eyebrows: Record<string, string>;
  titles: Record<string, string>;
  sections: SectionDef[];
  onCommitEyebrows: (next: Record<string, string>) => void;
  onCommitTitles: (next: Record<string, string>) => void;
}

export function EditorSecoes({
  eyebrows, titles, sections, onCommitEyebrows, onCommitTitles,
}: Props) {
  const [eb, setEb] = useState(eyebrows);
  const [tt, setTt] = useState(titles);
  useEffect(() => setEb(eyebrows), [eyebrows]);
  useEffect(() => setTt(titles), [titles]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[120px_1fr_2fr] gap-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        <div>Seção</div>
        <div>Eyebrow</div>
        <div>Título</div>
      </div>
      {sections.map((s) => (
        <div key={s.key} className="grid grid-cols-1 sm:grid-cols-[120px_1fr_2fr] gap-2 items-center">
          <div className="text-xs font-medium text-muted-foreground sm:pl-2">{s.label}</div>
          <Input
            value={eb[s.key] ?? ""}
            onChange={(e) => setEb((p) => ({ ...p, [s.key]: e.target.value }))}
            onBlur={() => {
              if (eb[s.key] !== eyebrows[s.key]) onCommitEyebrows(eb);
            }}
            placeholder="ex.: Contexto"
            className="h-8 text-xs"
          />
          <Input
            value={tt[s.key] ?? ""}
            onChange={(e) => setTt((p) => ({ ...p, [s.key]: e.target.value }))}
            onBlur={() => {
              if (tt[s.key] !== titles[s.key]) onCommitTitles(tt);
            }}
            placeholder="ex.: O ponto de partida"
            className="h-8 text-sm"
          />
        </div>
      ))}
    </div>
  );
}
