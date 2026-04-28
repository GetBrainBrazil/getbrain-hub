import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Code2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ACTION_COLORS, MODULE_LABEL, actionLabel, fieldLabel, formatValue, isMeaningfulField } from "@/lib/audit/formatters";
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
  entry,
  open,
  onOpenChange,
}: {
  entry: UnifiedAuditEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [showJson, setShowJson] = useState(false);

  if (!entry) return null;

  const dt = new Date(entry.created_at);
  const initials = (entry.actor?.name ?? "??").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const changes = entry.changes ?? {};
  const fieldKeys = Object.keys(changes).filter(isMeaningfulField);

  const route = entry.entity_type && entry.entity_id && ENTITY_ROUTES[entry.entity_type]
    ? ENTITY_ROUTES[entry.entity_type](entry.entity_id)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", ACTION_COLORS[entry.action])} />
            <Badge variant="outline" className="text-xs">{actionLabel(entry.rawAction)}</Badge>
            <Badge variant="secondary" className="text-xs">{MODULE_LABEL[entry.module]} · {entry.submoduleLabel}</Badge>
          </div>
          <SheetTitle className="text-left text-base font-medium leading-snug">
            {entry.entity_code ? (
              <span className="font-mono text-sm mr-2">{entry.entity_code}</span>
            ) : null}
            {entry.entity_title ?? entry.summary ?? `${actionLabel(entry.rawAction)} ${entry.submoduleLabel}`}
          </SheetTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="h-6 w-6">
              {entry.actor?.avatar_url ? <AvatarImage src={entry.actor.avatar_url} /> : null}
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <span>{entry.actor?.name ?? "Sistema"}</span>
            <span>·</span>
            <span>{dt.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {fieldKeys.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Campos alterados</h4>
              <div className="space-y-3">
                {fieldKeys.map((k) => {
                  const v = changes[k];
                  const isFromTo = v && typeof v === "object" && "from" in v && "to" in v;
                  return (
                    <div key={k} className="rounded-md border border-border bg-card/50 p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">{fieldLabel(k)}</div>
                      {isFromTo ? (
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 line-through">{formatValue(v.from)}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{formatValue(v.to)}</span>
                        </div>
                      ) : (
                        <div className="text-sm">{formatValue(v)}</div>
                      )}
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

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {route && (
              <Button
                variant="default"
                onClick={() => { onOpenChange(false); navigate(route); }}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir registro
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowJson((v) => !v)} className="gap-2">
              <Code2 className="h-4 w-4" />
              {showJson ? "Ocultar" : "Ver"} JSON
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
