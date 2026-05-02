import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, MessageCircle, X, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { GETBRAIN_INFO, whatsappUrl as buildWhatsappUrl } from "@/lib/getbrain-info";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  escalation?: boolean;
}

interface Props {
  brand: string;
  disabled: boolean;
  accessJwt: string | null;
  sessionToken: string;
  proposalCode: string;
  clientFirstName?: string | null;
  onManifestInterest: () => void;
}

const SUGGESTIONS = [
  "Quanto tempo leva pra ir ao ar?",
  "O que está incluso na manutenção?",
  "Como funciona o pagamento?",
  "E se eu precisar de algo a mais?",
];

export default function ProposalChatBubble({
  brand,
  disabled,
  accessJwt,
  sessionToken,
  proposalCode,
  clientFirstName,
  onManifestInterest,
}: Props) {
  const [open, setOpen] = useState(false);
  const [hasNewHint, setHasNewHint] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: clientFirstName
        ? `Oi ${clientFirstName}! Sou o agente de IA da GetBrain treinado nessa proposta. Pode me perguntar sobre escopo, prazos, formas de pagamento ou qualquer dúvida — respondo na hora.`
        : `Oi! Sou o agente de IA da GetBrain treinado nessa proposta. Pode me perguntar sobre escopo, prazos, formas de pagamento ou qualquer dúvida — respondo na hora.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      setHasNewHint(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const whatsappUrl = buildWhatsappUrl(
    `Olá Daniel, quero falar sobre a proposta ${proposalCode}`,
  );

  async function send(text: string) {
    if (!text || loading || !accessJwt) return;
    const newUser: ChatMessage = { role: "user", content: text };
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, newUser]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/proposal-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${accessJwt}`,
        },
        body: JSON.stringify({
          session_token: sessionToken,
          message: text,
          history,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const reply =
          data?.fallback ||
          (data?.error === "max_messages_reached"
            ? "Atingimos o limite de mensagens dessa sessão. Quer falar direto com o Daniel?"
            : data?.error === "chat_disabled"
              ? "Chat indisponível agora. Fala com o Daniel pelo WhatsApp."
              : "Tive um problema. Tenta de novo ou fala com o Daniel.");
        setMessages((m) => [...m, { role: "assistant", content: reply, escalation: true }]);
        return;
      }
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.reply,
          escalation: !!data.escalation_suggested,
        },
      ]);
    } catch (e) {
      console.error(e);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Ops, falhei ao responder. Tenta de novo ou fala com o Daniel pelo WhatsApp.",
          escalation: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (disabled) return null;

  return (
    <>
      {/* BUBBLE */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar chat" : "Abrir chat com agente IA"}
        className="fixed z-[55] bottom-5 right-5 sm:bottom-7 sm:right-7 group"
      >
        <span
          className="absolute inset-0 rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity"
          style={{ background: brand }}
        />
        <span
          className="relative flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full text-slate-900 shadow-2xl border border-white/20 transition-transform group-hover:scale-105 active:scale-95"
          style={{ background: brand }}
        >
          {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6 sm:h-7 sm:w-7" />}
        </span>
        {hasNewHint && !open && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400" />
          </span>
        )}
        {!open && (
          <span className="hidden sm:flex absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-white/95 backdrop-blur text-slate-900 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
            Pergunte ao agente IA
          </span>
        )}
      </button>

      {/* DRAWER */}
      <div
        className={`fixed z-[54] bottom-0 right-0 sm:bottom-24 sm:right-7 w-full sm:w-[400px] max-w-full transition-all duration-300 ${
          open
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-6 opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-[#0f1525] border border-white/10 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh] sm:h-[560px]">
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center gap-3 border-b border-white/10"
            style={{
              background:
                "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(59,130,246,0.06))",
            }}
          >
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-900 font-bold flex-shrink-0"
              style={{ background: brand }}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold leading-none">Agente IA · GetBrain</div>
              <div className="text-[11px] text-white/55 mt-1">
                Treinado nesta proposta · {proposalCode}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white p-1 rounded-md hover:bg-white/5 transition"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === "user"
                      ? "text-slate-900"
                      : "bg-white/5 text-white/90 border border-white/10"
                  }`}
                  style={m.role === "user" ? { background: brand } : undefined}
                >
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-p:leading-snug">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                  {m.escalation && m.role === "assistant" && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          onManifestInterest();
                          toast.success("Daniel foi avisado!");
                        }}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white text-slate-900 hover:bg-white/90 transition"
                      >
                        ✨ Avisar Daniel
                      </button>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-white/20 text-white hover:bg-white/10 transition inline-flex items-center gap-1"
                      >
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 text-white/60 rounded-2xl px-3.5 py-2.5 text-sm flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Pensando...
                </div>
              </div>
            )}
            {messages.length <= 1 && !loading && (
              <div className="pt-2 space-y-2">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 px-1">
                  Sugestões
                </div>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-left text-sm text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-white/10 p-3 bg-[#0a0e1a]">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input.trim());
                  }
                }}
                placeholder="Pergunte algo..."
                disabled={loading}
                className="flex-1 bg-white/5 border-white/15 text-white placeholder:text-white/35 text-sm h-10 focus-visible:ring-cyan-400/40"
              />
              <Button
                size="icon"
                onClick={() => send(input.trim())}
                disabled={loading || !input.trim()}
                style={{ background: brand, color: "#0a0e1a" }}
                className="flex-shrink-0 h-10 w-10 hover:opacity-90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="mt-2 text-[10px] text-white/35 text-center">
              Quer falar com humano?{" "}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                WhatsApp do Daniel
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
