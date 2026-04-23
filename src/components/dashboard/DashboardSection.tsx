/**
 * DashboardSection — bloco temático do dashboard.
 * Título imperativo + subtítulo (a pergunta que o bloco responde) + grid.
 */
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  question: string;
  children: ReactNode;
  className?: string;
}

export function DashboardSection({ title, question, children, className }: Props) {
  return (
    <section className={cn("space-y-3", className)}>
      <header>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground">{question}</p>
      </header>
      <div className="grid grid-cols-12 gap-3">{children}</div>
    </section>
  );
}
