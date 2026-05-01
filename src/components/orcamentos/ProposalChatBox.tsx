import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  onManifestInterest: () => void;
}

export default function ProposalChatBox({
  brand,
  disabled,
  accessJwt,
  sessionToken,
  proposalCode,
  onManifestInterest,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Oi! Sou o assistente da GetBrain. Posso esclarecer dúvidas sobre esta proposta — escopo, prazos, próximos passos. O que você quer saber?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !accessJwt) return;

    const newUser: ChatMessage = { role: "user", content: text };
    const history = messages.filter((m) => m.role !== "assistant" || m.content)
      .map(({ role, content }) => ({ role, content }));

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
            ? "Atingimos o limite de mensagens desta sessão. Quer falar direto com o Daniel?"
            : data?.error === "chat_disabled"
            ? "Chat indisponível no momento. Fale com o Daniel pelo WhatsApp."
            : "Tive um problema agora. Pode tentar de novo ou falar direto com o Daniel.");
        setMessages((m) => [
          ...m,
          { role: "assistant", content: reply, escalation: true },
        ]);
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
          content:
            "Ops, falhei ao responder. Tenta de novo? Se persistir, fala com o Daniel pelo WhatsApp.",
          escalation: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const whatsappUrl = `https://wa.me/5511999999999?text=${
    encodeURIComponent(
      `Olá Daniel, quero falar sobre a proposta ${proposalCode}`,
    )
  }`;

  if (disabled) {
    return (
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 flex-shrink-0" style={{ color: brand }} />
          <Input
            disabled
            placeholder="Chat desabilitado em modo preview"
            className="flex-1 bg-slate-50 border-slate-200 text-slate-500 text-sm cursor-not-allowed"
          />
          <Button size="icon" variant="ghost" disabled className="flex-shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {open && (
          <div className="border-b border-slate-100 -mx-4 sm:-mx-6 px-4 sm:px-6">
            <div
              ref={scrollRef}
              className="max-h-[40vh] overflow-y-auto py-4 space-y-3"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === "user"
                        ? "text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                    style={
                      m.role === "user" ? { background: brand } : undefined
                    }
                  >
                    <div className="prose prose-sm max-w-none prose-p:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    {m.escalation && m.role === "assistant" && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            onManifestInterest();
                            toast.success("Daniel foi avisado. Ele te chama em breve!");
                          }}
                        >
                          ✨ Avisar Daniel
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          asChild
                        >
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-500 rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Pensando...
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex-shrink-0 p-1.5 rounded hover:bg-slate-100 transition-colors"
            aria-label={open ? "Recolher chat" : "Expandir chat"}
          >
            <Sparkles className="h-4 w-4" style={{ color: brand }} />
          </button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Pergunte algo sobre esta proposta..."
            disabled={loading}
            className="flex-1 bg-white border-slate-200 text-sm"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{ background: brand, color: "white" }}
            className="flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
