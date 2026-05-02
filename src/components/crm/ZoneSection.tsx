import type { ReactNode } from 'react';

/**
 * Bloco numerado de zona (padrão visual do CrmDealDetail).
 * Usado também no CrmLeadDetail.
 */
export function ZoneSection({
  id, number, title, hint, action, children,
}: {
  id?: string;
  number: number;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-lg border border-border bg-card/30 p-5">
      <header className="mb-4 flex flex-wrap items-baseline gap-3 border-b border-border/60 pb-3">
        <span className="font-mono text-xs text-muted-foreground">
          {String(number).padStart(2, '0')}
        </span>
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
