import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Bot, ChevronRight } from "lucide-react";
import {
  ACTION_COLORS, MODULE_BADGE, MODULE_LABEL,
  actionVerb, describeDiff, diffChanges, resolveModule,
} from "@/lib/audit/formatters";
import { UnifiedAuditEntry } from "@/hooks/admin/useUnifiedAudit";

export function AuditFeedItem({ entry, onClick }: { entry: UnifiedAuditEntry; onClick: () => void }) {
  const time = new Date(entry.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const { entityNoun } = resolveModule(entry.entity_type);
  const actorName = entry.actor?.name ?? null;
  const isAutomatic = !actorName;
  const initials = (actorName ?? "Sis").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  // Action sentence ("alterou um deal", "entrou no sistema"…)
  let actionPhrase = actionVerb(entry.action, entityNoun);
  if (entry.action === "login") actionPhrase = "entrou no sistema";

  // What changed
  let detail: string | null = null;
  if (entry.summary) {
    detail = entry.summary;
  } else if (entry.changes) {
    detail = describeDiff(diffChanges(entry.changes));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left flex items-start gap-3 px-3 sm:px-4 py-3 rounded-lg hover:bg-muted/40 transition-colors border border-transparent hover:border-border/50"
    >
      {/* Bullet */}
      <div className="flex flex-col items-center pt-1.5 shrink-0">
        <span className={cn("h-2.5 w-2.5 rounded-full ring-4 ring-background", ACTION_COLORS[entry.action])} />
      </div>

      {/* Time */}
      <span className="text-xs text-muted-foreground font-mono pt-1 w-12 shrink-0 hidden sm:block">{time}</span>

      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        {entry.actor?.avatar_url ? <AvatarImage src={entry.actor.avatar_url} /> : null}
        <AvatarFallback className={cn("text-[11px]", isAutomatic && "bg-muted")}>
          {isAutomatic ? <Bot className="h-4 w-4" /> : initials}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Line 1: Quem + ação */}
        <div className="text-sm">
          <span className="font-semibold text-foreground">
            {isAutomatic ? "Automático" : actorName}
          </span>
          <span className="text-muted-foreground"> {actionPhrase}</span>
          <span className="sm:hidden text-muted-foreground font-mono ml-2">{time}</span>
        </div>

        {/* Line 2: Onde (badge módulo + submódulo + código + título) */}
        <div className="flex items-center gap-1.5 mt-1 text-xs flex-wrap">
          <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border font-medium", MODULE_BADGE[entry.module])}>
            {MODULE_LABEL[entry.module]}
          </span>
          <span className="text-muted-foreground">{entry.submoduleLabel}</span>
          {entry.entity_code && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="font-mono text-foreground/80">{entry.entity_code}</span>
            </>
          )}
          {entry.entity_title && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground truncate max-w-[280px]">{entry.entity_title}</span>
            </>
          )}
        </div>

        {/* Line 3: O quê mudou */}
        {detail && (
          <div className="mt-1.5 flex items-start gap-1.5 text-sm">
            <span className="text-muted-foreground/60 mt-0.5">▸</span>
            <span className="text-foreground/90">{detail}</span>
          </div>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-2" />
    </button>
  );
}
