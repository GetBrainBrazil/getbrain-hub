import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Code2, User, Clock, Zap, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ACTION_COLORS, MODULE_BADGE, MODULE_LABEL,
  actionVerb, diffChanges, fieldLabel, formatValue,
  relativeTime, resolveModule, sourceLabel,
} from "@/lib/audit/formatters";
import { UnifiedAuditEntry } from "@/hooks/admin/useUnifiedAudit";
import { cn } from "@/lib/utils";

const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  deals: (id) => `/crm?dealId=${id}`,
  leads: (id) => `/crm?leadId=${id}`,
  companies: (id) => `/crm?companyId=${id}`,
  projects: (id) => `/projects/${id}`,
  movimentacoes: (id) => `/financeiro?movId=${id}`,
  profiles: (id) => `/admin/usuarios/${id}`,
  cargos: () => `/admin/permissoes`,
};

export function AuditDetailDrawer({
  entry, open, onOpenChange,
}: {
  entry: UnifiedAuditEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [showJson, setShowJson] = useState(false);

  if (!entry) return null;

  const dt = new Date(entry.created_at);
  const { entityNoun } = resolveModule(entry.entity_type);
  const actorName = entry.actor?.name ?? null;
  const isAutomatic = !actorName;
  const initials = (actorName ?? "Sis").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const diff = entry.changes ? diffChanges(entry.changes) : {};
  const fieldKeys = Object.keys(diff);

  const route = entry.entity_type && entry.entity_id && ENTITY_ROUTES[entry.entity_type]
    ? ENTITY_ROUTES[entry.entity_type](entry.entity_id)
    : null;

  const verb = entry.action === "login" ? "entrou no sistema" : actionVerb(entry.action, entityNoun);
  const source = sourceLabel(entry.metadata, entry.source, !isAutomatic);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-3 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("h-2.5 w-2.5 rounded-full", ACTION_COLORS[entry.action])} />
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium", MODULE_BADGE[entry.module])}>
              {MODULE_LABEL[entry.module]}
            </span>
            <span className="text-xs text-muted-foreground">{entry.submoduleLabel}</span>
            {entry.entity_code && (
              <span className="font-mono text-xs text-foreground">{entry.entity_code}</span>
            )}
          </div>
          <SheetTitle className="text-base font-semibold leading-snug">
            {entry.entity_title ?? entry.summary ?? `${MODULE_LABEL[entry.module]} · ${entry.submoduleLabel}`}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{actorName ?? "Automático"}</span>{" "}{verb}.
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Quem / Quando / Origem */}
          <div className="rounded-lg border border-border bg-card/30 p-3 space-y-2.5 text-sm">
            <div className="flex items-start gap-2.5">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">Quem fez</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Avatar className="h-5 w-5">
                    {entry.actor?.avatar_url ? <AvatarImage src={entry.actor.avatar_url} /> : null}
                    <AvatarFallback className="text-[9px]">
                      {isAutomatic ? <Bot className="h-3 w-3" /> : initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{actorName ?? "Automático (sistema)"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">Quando</div>
                <div className="font-medium mt-0.5">
                  {dt.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}
                  <span className="text-muted-foreground font-normal ml-1.5">({relativeTime(entry.created_at)})</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Zap className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">Origem da ação</div>
                <div className="font-medium mt-0.5">{source}</div>
              </div>
            </div>
          </div>

          {/* Campos alterados */}
          {fieldKeys.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                O que mudou ({fieldKeys.length} {fieldKeys.length === 1 ? "campo" : "campos"})
              </h4>
              <div className="space-y-2">
                {fieldKeys.map((k) => {
                  const { from, to } = diff[k];
                  return (
                    <div key={k} className="rounded-md border border-border bg-card/50 p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">{fieldLabel(k)}</div>
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 line-through">
                          {formatValue(from, k)}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {formatValue(to, k)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {entry.summary && fieldKeys.length === 0 && (
            <p className="text-sm">{entry.summary}</p>
          )}

          {fieldKeys.length === 0 && !entry.summary && (
            <p className="text-sm text-muted-foreground">Sem detalhes adicionais.</p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {route && (
              <Button onClick={() => { onOpenChange(false); navigate(route); }} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Abrir registro
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowJson((v) => !v)} className="gap-2">
              <Code2 className="h-4 w-4" />
              {showJson ? "Ocultar" : "Ver"} dados técnicos
            </Button>
          </div>

          {showJson && (
            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify({ changes: entry.changes, metadata: entry.metadata }, null, 2)}
            </pre>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
