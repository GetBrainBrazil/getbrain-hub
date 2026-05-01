import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  MessageCircle,
  Download,
  ThumbsUp,
  Loader2,
  Clock,
  Bot,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proposalId: string | null;
  proposalCode?: string;
}

interface ViewRow {
  id: string;
  session_token: string;
  viewed_at: string;
  duration_seconds: number;
  pdf_downloaded: boolean;
  user_agent: string | null;
}

interface EventRow {
  id: string;
  event_type: string;
  metadata: any;
  created_at: string;
}

interface ChatSessionRow {
  id: string;
  started_at: string;
  message_count: number;
  escalated_to_whatsapp: boolean;
  user_agent: string | null;
}

interface ChatMessageRow {
  id: string;
  role: string;
  content: string;
  created_at: string;
  was_filtered: boolean | null;
  was_escalation_suggested: boolean | null;
  cost_usd: number | null;
}

export function PropostaTrackingSheet({
  open,
  onOpenChange,
  proposalId,
  proposalCode,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [views, setViews] = useState<ViewRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSessionRow[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<
    Record<string, ChatMessageRow[]>
  >({});

  useEffect(() => {
    if (!open || !proposalId) return;
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proposalId]);

  async function loadData() {
    if (!proposalId) return;
    setLoading(true);
    try {
      const [v, e, s] = await Promise.all([
        supabase
          .from("proposal_views")
          .select("id, session_token, viewed_at, duration_seconds, pdf_downloaded, user_agent")
          .eq("proposal_id", proposalId)
          .order("viewed_at", { ascending: false })
          .limit(50),
        supabase
          .from("proposal_events")
          .select("id, event_type, metadata, created_at")
          .eq("proposal_id", proposalId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("proposal_chat_sessions")
          .select("id, started_at, message_count, escalated_to_whatsapp, user_agent")
          .eq("proposal_id", proposalId)
          .order("started_at", { ascending: false })
          .limit(20),
      ]);
      setViews((v.data ?? []) as ViewRow[]);
      setEvents((e.data ?? []) as EventRow[]);
      setChatSessions((s.data ?? []) as ChatSessionRow[]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSessionMessages(sessionId: string) {
    if (sessionMessages[sessionId]) {
      setExpandedSession(expandedSession === sessionId ? null : sessionId);
      return;
    }
    const { data } = await supabase
      .from("proposal_chat_messages")
      .select("id, role, content, created_at, was_filtered, was_escalation_suggested, cost_usd")
      .eq("session_id", sessionId)
      .order("created_at");
    setSessionMessages((m) => ({ ...m, [sessionId]: (data ?? []) as ChatMessageRow[] }));
    setExpandedSession(sessionId);
  }

  const totalViews = views.length;
  const totalDuration = views.reduce((a, v) => a + (v.duration_seconds ?? 0), 0);
  const totalDownloads = views.filter((v) => v.pdf_downloaded).length;
  const totalChats = chatSessions.length;
  const interestEvents = events.filter((e) => e.event_type === "interest_manifested").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Tracking · {proposalCode ?? "Proposta"}
          </SheetTitle>
          <SheetDescription>
            Quem viu, baixou, conversou e demonstrou interesse.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Kpi icon={<Eye className="h-4 w-4" />} label="Views" value={totalViews} />
              <Kpi
                icon={<Clock className="h-4 w-4" />}
                label="Tempo total"
                value={formatDuration(totalDuration)}
              />
              <Kpi
                icon={<Download className="h-4 w-4" />}
                label="PDFs baixados"
                value={totalDownloads}
              />
              <Kpi
                icon={<ThumbsUp className="h-4 w-4" />}
                label="Interesses"
                value={interestEvents}
              />
            </div>

            {/* Timeline de eventos */}
            <Section title="Linha do tempo">
              {events.length === 0 ? (
                <Empty text="Nenhum evento ainda. Quando o cliente abrir a proposta, aparecerá aqui." />
              ) : (
                <div className="space-y-2">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start gap-3 text-sm border-l-2 border-muted pl-3 py-1"
                    >
                      <EventIcon type={ev.event_type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {labelForEvent(ev.event_type)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelative(ev.created_at)}
                          </span>
                        </div>
                        {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                          <pre className="mt-1 text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded overflow-x-auto">
                            {JSON.stringify(ev.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Views detalhadas */}
            <Section title={`Sessões de visualização (${totalViews})`}>
              {views.length === 0 ? (
                <Empty text="Nenhuma view registrada." />
              ) : (
                <div className="space-y-2">
                  {views.map((v) => (
                    <Card key={v.id} className="p-3 text-sm flex items-center gap-3">
                      <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-muted-foreground truncate">
                          {v.session_token.slice(0, 8)}…
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatRelative(v.viewed_at)} · {formatDuration(v.duration_seconds)}
                          {v.pdf_downloaded && " · 📄 PDF baixado"}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Section>

            {/* Chat sessions */}
            <Section title={`Conversas no chat (${totalChats})`}>
              {chatSessions.length === 0 ? (
                <Empty text="Nenhuma conversa iniciada." />
              ) : (
                <div className="space-y-2">
                  {chatSessions.map((s) => (
                    <Card key={s.id} className="overflow-hidden">
                      <button
                        type="button"
                        onClick={() => loadSessionMessages(s.id)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 text-left"
                      >
                        <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            {s.message_count} mensagens
                            {s.escalated_to_whatsapp && (
                              <Badge variant="secondary" className="ml-2 text-[10px]">
                                Escalou
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatRelative(s.started_at)}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {expandedSession === s.id ? "▲" : "▼"}
                        </span>
                      </button>
                      {expandedSession === s.id && (
                        <div className="border-t p-3 space-y-2 bg-muted/10">
                          {(sessionMessages[s.id] ?? []).map((m) => (
                            <div
                              key={m.id}
                              className={`text-xs rounded px-2 py-1.5 ${
                                m.role === "user"
                                  ? "bg-primary/10 text-foreground"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                {m.role === "user" ? "Cliente" : (
                                  <>
                                    <Bot className="h-3 w-3" /> IA
                                  </>
                                )}
                                {m.was_filtered && (
                                  <Badge variant="destructive" className="text-[9px] h-4">
                                    Filtrado
                                  </Badge>
                                )}
                                {m.was_escalation_suggested && (
                                  <Badge variant="secondary" className="text-[9px] h-4">
                                    Escalation
                                  </Badge>
                                )}
                              </div>
                              <div className="whitespace-pre-wrap">{m.content}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-xs text-muted-foreground italic py-4 text-center border border-dashed rounded">
      {text}
    </div>
  );
}

function EventIcon({ type }: { type: string }) {
  const map: Record<string, React.ReactNode> = {
    view: <Eye className="h-4 w-4 text-blue-500" />,
    pdf_download: <Download className="h-4 w-4 text-purple-500" />,
    interest_manifested: <ThumbsUp className="h-4 w-4 text-green-500" />,
    section_viewed: <Eye className="h-4 w-4 text-muted-foreground" />,
  };
  return <>{map[type] ?? <Eye className="h-4 w-4 text-muted-foreground" />}</>;
}

function labelForEvent(type: string): string {
  const map: Record<string, string> = {
    view: "Cliente abriu a proposta",
    pdf_download: "PDF baixado",
    interest_manifested: "Interesse manifestado",
    section_viewed: "Seção visualizada",
  };
  return map[type] ?? type;
}

function formatRelative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return iso;
  }
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}
