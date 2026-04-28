import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ACTION_COLORS, MODULE_LABEL, actionLabel, fieldLabel, formatValue, isMeaningfulField } from "@/lib/audit/formatters";
import { UnifiedAuditEntry } from "@/hooks/admin/useUnifiedAudit";
import { ChevronRight } from "lucide-react";

function describe(entry: UnifiedAuditEntry): string {
  if (entry.summary) return entry.summary;
  const changes = entry.changes ?? {};
  const keys = Object.keys(changes).filter(isMeaningfulField);
  if (entry.action === "create") return `Criou ${entry.submoduleLabel.toLowerCase()}`;
  if (entry.action === "delete") return `Removeu ${entry.submoduleLabel.toLowerCase()}`;
  if (entry.action === "status_change") {
    const f = changes.status ?? changes.stage;
    if (f && typeof f === "object" && "from" in f) {
      return `Mudou status: ${formatValue(f.from)} → ${formatValue(f.to)}`;
    }
    return "Mudou status";
  }
  if (keys.length === 0) return `${actionLabel(entry.rawAction)} ${entry.submoduleLabel.toLowerCase()}`;
  if (keys.length === 1) {
    const k = keys[0];
    const v = changes[k];
    if (v && typeof v === "object" && "from" in v && "to" in v) {
      return `Alterou ${fieldLabel(k)}: ${formatValue(v.from)} → ${formatValue(v.to)}`;
    }
    return `Alterou ${fieldLabel(k)}`;
  }
  return `Alterou ${keys.length} campos: ${keys.slice(0, 3).map(fieldLabel).join(", ")}${keys.length > 3 ? "…" : ""}`;
}

export function AuditFeedItem({ entry, onClick }: { entry: UnifiedAuditEntry; onClick: () => void }) {
  const time = new Date(entry.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const initials = (entry.actor?.name ?? "??").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left flex items-start gap-3 px-3 sm:px-4 py-3 rounded-lg hover:bg-muted/40 transition-colors border border-transparent hover:border-border/50"
    >
      {/* Bullet */}
      <div className="flex flex-col items-center pt-1.5">
        <span className={cn("h-2.5 w-2.5 rounded-full ring-4 ring-background", ACTION_COLORS[entry.action])} />
      </div>

      {/* Time */}
      <span className="text-xs text-muted-foreground font-mono pt-1 w-12 shrink-0 hidden sm:block">{time}</span>

      {/* Avatar */}
      <Avatar className="h-7 w-7 shrink-0">
        {entry.actor?.avatar_url ? <AvatarImage src={entry.actor.avatar_url} /> : null}
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground">{entry.actor?.name ?? "Sistema"}</span>
          <span>·</span>
          <span>{MODULE_LABEL[entry.module]}</span>
          <span>·</span>
          <span>{entry.submoduleLabel}</span>
          {entry.entity_code ? (
            <>
              <span>·</span>
              <span className="font-mono text-foreground/80">{entry.entity_code}</span>
            </>
          ) : null}
          <span className="sm:hidden ml-auto font-mono">{time}</span>
        </div>
        <div className="text-sm text-foreground mt-0.5 truncate">{describe(entry)}</div>
        {entry.entity_title ? (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{entry.entity_title}</div>
        ) : null}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-2" />
    </button>
  );
}
