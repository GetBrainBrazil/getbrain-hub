import { Sparkles } from "lucide-react";

interface PlaceholderTabProps {
  title: string;
  promptCode: string;
  description: string;
}

/** Placeholder profissional para sub-abas que ainda não estão implementadas. */
export function PlaceholderTab({ title, promptCode, description }: PlaceholderTabProps) {
  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/10 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
        <Sparkles className="h-6 w-6 text-accent" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        <p className="pt-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">
          Em desenvolvimento — {promptCode}
        </p>
      </div>
    </div>
  );
}
