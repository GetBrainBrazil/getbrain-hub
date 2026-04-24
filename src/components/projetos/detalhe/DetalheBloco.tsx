/**
 * Wrapper visual padronizado dos blocos das telas detalhadas.
 * Mesmo estilo do `Panel` da AbaOperacional, com header + ação.
 */
import { cn } from "@/lib/utils";

interface DetalheBlocoProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function DetalheBloco({
  icon: Icon,
  title,
  badge,
  action,
  className,
  children,
}: DetalheBlocoProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card p-6 transition-colors hover:border-border/80",
        className,
      )}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-accent" />}
          <h3 className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {title}
          </h3>
          {badge}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function ComingSoonBlock({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-warning/30 bg-warning/5 px-4 py-8 text-center">
      <p className="text-xs font-medium text-warning">Módulo em breve</p>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{message}</p>
    </div>
  );
}
