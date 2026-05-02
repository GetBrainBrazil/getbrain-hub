/**
 * Barra de tabs sticky (logo abaixo do header + pipeline).
 *
 * - Renderiza 9 tabs na ordem: Resumo · Cliente · Escopo · Conteúdo IA ·
 *   Página Pública · Histórico · Interações · Versões · Configurações
 * - Sincroniza com URL via `?tab=...` — útil para Daniel mandar link
 *   "olha a aba Histórico" e a pessoa abrir já na aba certa.
 * - Suporta badges com contadores (escopo, interações, versões).
 * - Em mobile vira `Select` para preservar o uso vertical da tela.
 *
 * Componente "burro" — apenas controla qual tab está ativa.
 * O orquestrador é responsável por renderizar APENAS a tab ativa
 * (lazy mount/unmount, conforme decisão da Fase 1).
 */
import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ProposalTabKey =
  | "resumo"
  | "cliente"
  | "escopo"
  | "conteudo_ia"
  | "pagina_publica"
  | "historico"
  | "interacoes"
  | "versoes"
  | "configuracoes";

const TAB_ORDER: ProposalTabKey[] = [
  "resumo",
  "cliente",
  "escopo",
  "conteudo_ia",
  "pagina_publica",
  "historico",
  "interacoes",
  "versoes",
  "configuracoes",
];

const TAB_LABEL: Record<ProposalTabKey, string> = {
  resumo: "Resumo",
  cliente: "Cliente",
  escopo: "Escopo",
  conteudo_ia: "Conteúdo IA",
  pagina_publica: "Página Pública",
  historico: "Histórico",
  interacoes: "Interações",
  versoes: "Versões",
  configuracoes: "Configurações",
};

export interface TabBadges {
  escopo?: number;
  interacoes?: number;
  versoes?: number;
}

export function isProposalTabKey(v: string | null | undefined): v is ProposalTabKey {
  return !!v && (TAB_ORDER as string[]).includes(v);
}

interface Props {
  active: ProposalTabKey;
  badges?: TabBadges;
  onChange: (tab: ProposalTabKey) => void;
}

export function ProposalTabsBar({ active, badges, onChange }: Props) {
  // Mantém URL e estado em sincronia. Se a URL chegar com tab inválida ou
  // ausente, normalizamos para "resumo".
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const current = params.get("tab");
    if (!isProposalTabKey(current) || current !== active) {
      const next = new URLSearchParams(params);
      next.set("tab", active);
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const items = useMemo(
    () =>
      TAB_ORDER.map((key) => ({
        key,
        label: TAB_LABEL[key],
        badge:
          key === "escopo" ? badges?.escopo
          : key === "interacoes" ? badges?.interacoes
          : key === "versoes" ? badges?.versoes
          : undefined,
      })),
    [badges],
  );

  return (
    <nav
      className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur"
      aria-label="Seções da proposta"
    >
      {/* Desktop / tablet */}
      <div className="hidden md:flex items-center gap-1 px-3 sm:px-5 py-1.5 overflow-x-auto scrollbar-hide">
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange(it.key)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {it.label}
              {typeof it.badge === "number" && it.badge > 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "px-1.5 py-0 h-4 text-[10px] tabular-nums font-semibold",
                    isActive
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-border bg-muted/60 text-muted-foreground",
                  )}
                >
                  {it.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile: Select compacto */}
      <div className="md:hidden px-3 py-2">
        <Select value={active} onValueChange={(v) => onChange(v as ProposalTabKey)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((it) => (
              <SelectItem key={it.key} value={it.key} className="text-sm">
                <span className="inline-flex items-center gap-2">
                  {it.label}
                  {typeof it.badge === "number" && it.badge > 0 && (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 h-4 text-[10px] tabular-nums"
                    >
                      {it.badge}
                    </Badge>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </nav>
  );
}
