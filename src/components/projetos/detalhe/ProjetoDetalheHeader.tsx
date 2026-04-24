/**
 * Cabeçalho compartilhado pelas telas de detalhe por bloco do projeto
 * (Financeiro, Tarefas, Suporte, Tokens).
 *
 * Densidade alta — espelha o estilo dos dashboards 09A/09B.
 */
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "danger" | "accent" | "muted";

const toneText: Record<Tone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  accent: "text-accent",
  muted: "text-muted-foreground",
};

export interface MiniKpi {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
}

export interface ProjetoDetalheHeaderProps {
  projectId: string;
  projectCode?: string;
  projectName?: string;
  companyName?: string | null;
  statusBadge?: React.ReactNode;
  title: string;
  subtitle?: string;
  kpis?: MiniKpi[];
  loading?: boolean;
}

export function ProjetoDetalheHeader({
  projectId,
  projectCode,
  projectName,
  companyName,
  statusBadge,
  title,
  subtitle,
  kpis = [],
  loading,
}: ProjetoDetalheHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="space-y-4 border-b border-border pb-6">
      {/* Breadcrumb / voltar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
        <span>·</span>
        <Link to="/projetos" className="hover:text-foreground">
          Projetos
        </Link>
        {projectCode && (
          <>
            <span>·</span>
            <Link
              to={`/projetos/${projectId}`}
              className="font-mono hover:text-foreground"
            >
              {projectCode}
            </Link>
          </>
        )}
      </div>

      {/* Título principal */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
            {title}
          </p>
          <h1 className="mt-1 truncate text-2xl font-bold leading-tight text-foreground">
            {projectName ?? (loading ? "…" : "Projeto")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {companyName && <span className="text-foreground/70">{companyName}</span>}
            {companyName && subtitle && <span className="mx-1.5">·</span>}
            {subtitle}
          </p>
        </div>
        {statusBadge}
      </div>

      {/* Mini-KPIs */}
      {kpis.length > 0 && (
        <div
          className={cn(
            "grid gap-2",
            kpis.length === 2 && "grid-cols-2",
            kpis.length === 3 && "grid-cols-2 md:grid-cols-3",
            kpis.length >= 4 && "grid-cols-2 md:grid-cols-4",
          )}
        >
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-md border border-border bg-card px-3 py-2"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {k.label}
              </p>
              <p
                className={cn(
                  "mt-1 font-mono text-lg font-bold leading-none tabular-nums",
                  toneText[k.tone ?? "default"],
                )}
              >
                {k.value}
              </p>
              {k.hint && (
                <p className="mt-1 truncate text-[10px] text-muted-foreground">
                  {k.hint}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
