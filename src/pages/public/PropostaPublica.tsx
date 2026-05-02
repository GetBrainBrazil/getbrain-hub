import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Loader2,
  Download,
  ExternalLink,
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Lock,
  Plus,
  Minus,
  MessageCircle,
  ThumbsUp,
  Sparkles,
  CheckCircle2,
  Zap,
  Brain,
  Target,
  Rocket,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ABOUT_GETBRAIN_PARAGRAPHS } from "@/content/about-getbrain";
import ProposalChatBubble from "@/components/orcamentos/ProposalChatBubble";
import { GETBRAIN_INFO, whatsappUrl as buildWhatsappUrl } from "@/lib/getbrain-info";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const DEFAULT_BRAND = "#22D3EE";

interface PublicProposal {
  code: string;
  title: string | null;
  client_name: string;
  client_company_name: string;
  client_city: string | null;
  client_logo_url: string | null;
  client_brand_color: string | null;
  welcome_message: string | null;
  executive_summary: string | null;
  pain_context: string | null;
  solution_overview: string | null;
  considerations: string[];
  maintenance_description: string | null;
  maintenance_monthly_value: number | null;
  implementation_days: number | null;
  validation_days: number | null;
  expires_at: string | null;
  mockup_url: string | null;
  sent_at: string | null;
  recipient_first_name: string | null;
  implementation_value: number | null;
  installments_count: number | null;
  first_installment_date: string | null;
  public_opening_letter: string | null;
  public_roadmap: { phases: Array<{ number: number; title: string; duration_days: number; outcome: string; deliverables: string[] }> } | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    detailed_description: string | null;
    long_description?: string | null;
    deliverables: string[];
    acceptance_criteria: string[];
    client_dependencies: string[];
  }>;
}

function formatBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

async function callEdge(name: string, body: unknown, jwt?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON,
  };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function PropostaPublica() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const previewJwt = searchParams.get("preview");
  const [accessJwt, setAccessJwt] = useState<string | null>(null);
  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pwdInput, setPwdInput] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [expiredOn, setExpiredOn] = useState<string | null>(null);
  const isPreview = !!previewJwt;

  useEffect(() => {
    if (!previewJwt) return;
    (async () => {
      setLoading(true);
      const r = await callEdge("get-proposal-public-data", {}, previewJwt);
      if (!r.ok) {
        setAuthError("Preview expirado. Volte ao editor e gere outro.");
        setLoading(false);
        return;
      }
      setAccessJwt(previewJwt);
      setProposal(r.data.proposal as PublicProposal);
      setLoading(false);
    })();
  }, [previewJwt]);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!token || pwdInput.length < 1) return;
    setLoading(true);
    setAuthError(null);
    setExpiredOn(null);
    const { ok, status, data } = await callEdge("verify-proposal-access", {
      token,
      password: pwdInput,
    });
    if (!ok) {
      if (data?.error === "rate_limited") {
        setAuthError("Muitas tentativas. Aguarde 15 minutos e tente novamente.");
      } else if (data?.error === "expired") {
        setAuthError(null);
        setExpiredOn(data?.expires_at ?? null);
      } else if (data?.error === "invalid_token") {
        setAuthError("Link inválido ou expirado.");
      } else if (status === 401) {
        setAuthError("Senha incorreta. Tente novamente.");
      } else {
        setAuthError("Não foi possível acessar. Tente novamente.");
      }
      setLoading(false);
      return;
    }
    const jwt = data.access_jwt as string;
    setAccessJwt(jwt);
    const r = await callEdge("get-proposal-public-data", {}, jwt);
    if (!r.ok) {
      setAuthError("Erro ao carregar proposta.");
      setAccessJwt(null);
      setLoading(false);
      return;
    }
    setProposal(r.data.proposal as PublicProposal);
    setPwdInput("");
    setLoading(false);
  }

  async function handleDownloadPdf() {
    if (!accessJwt) return;
    const { ok, data } = await callEdge("get-proposal-pdf-public", {}, accessJwt);
    if (!ok) {
      if (data?.error === "no_pdf_available") {
        toast.error("PDF ainda não disponível. Solicite ao Daniel pelo WhatsApp.");
      } else if (data?.error === "unauthorized") {
        toast.error("Sessão expirada. Digite a senha novamente.");
        setAccessJwt(null);
        setProposal(null);
      } else {
        toast.error("Não foi possível gerar o PDF.");
      }
      return;
    }
    if (!isPreview) {
      trackEvent(accessJwt, "pdf_download", { url: data.url });
    }
    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  if (!proposal) {
    return (
      <PasswordGate
        loading={loading}
        authError={authError}
        expiredOn={expiredOn}
        password={pwdInput}
        showPwd={showPwd}
        onPwdChange={setPwdInput}
        onToggleShow={() => setShowPwd((v) => !v)}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <ProposalView
      proposal={proposal}
      onDownloadPdf={handleDownloadPdf}
      isPreview={isPreview}
      accessJwt={accessJwt}
    />
  );
}

/* ------------------------- TRACKING ------------------------- */

function getOrCreateSessionToken(proposalCode: string): string {
  const key = `proposal_session_${proposalCode}`;
  try {
    let t = localStorage.getItem(key);
    if (!t) {
      t = crypto.randomUUID();
      localStorage.setItem(key, t);
    }
    return t;
  } catch {
    return crypto.randomUUID();
  }
}

async function trackEvent(
  jwt: string,
  event: "view" | "pdf_download" | "interest_manifested" | "section_viewed",
  metadata?: Record<string, unknown>,
) {
  try {
    const sessionToken = (metadata?.__session as string) ||
      localStorage.getItem("__last_session__") || crypto.randomUUID();
    const cleanMeta = { ...metadata };
    delete (cleanMeta as any).__session;
    await fetch(`${SUPABASE_URL}/functions/v1/track-proposal-view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        event,
        session_token: sessionToken,
        metadata: cleanMeta,
      }),
    });
  } catch (e) {
    console.warn("track failed", e);
  }
}

/* ------------------------- TELA DE SENHA ------------------------- */

function PasswordGate(props: {
  loading: boolean;
  authError: string | null;
  expiredOn: string | null;
  password: string;
  showPwd: boolean;
  onPwdChange: (v: string) => void;
  onToggleShow: () => void;
  onSubmit: (e?: React.FormEvent) => void;
}) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0e1a] text-white flex flex-col">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[140px]" />
      </div>

      <header className="relative px-6 py-6 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-sm">
          G
        </div>
        <span className="font-bold tracking-tight text-lg">GetBrain</span>
      </header>

      <main className="relative flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="h-12 w-12 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
                <Lock className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div className="space-y-1 mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight">
                Proposta protegida
              </h1>
              <p className="text-sm text-white/60">
                Digite a senha que você recebeu junto com o link.
              </p>
            </div>
            {props.expiredOn ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200 flex gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Esta proposta expirou em <strong>{formatDate(props.expiredOn)}</strong>.
                  Entre em contato com Daniel.
                </span>
              </div>
            ) : (
              <form onSubmit={props.onSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    type={props.showPwd ? "text" : "password"}
                    value={props.password}
                    onChange={(e) => props.onPwdChange(e.target.value)}
                    placeholder="Senha de acesso"
                    autoFocus
                    className="pr-10 h-12 bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-cyan-400/40"
                  />
                  <button
                    type="button"
                    onClick={props.onToggleShow}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    {props.showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {props.authError && (
                  <p className="text-xs text-red-300">{props.authError}</p>
                )}
                <Button
                  type="submit"
                  disabled={props.loading || !props.password}
                  className="w-full h-12 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-900 font-semibold border-0"
                >
                  {props.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>Acessar proposta <ArrowRight className="h-4 w-4 ml-1" /></>
                  )}
                </Button>
              </form>
            )}
          </div>
          <p className="text-center text-xs text-white/40 mt-6">
            Problemas?{" "}
            <a
              href={`https://wa.me/${GETBRAIN_INFO.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-cyan-400"
            >
              Fale com a GetBrain
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ===================================================================== */
/*                       VIEW EDITORIAL CINEMATOGRÁFICA                  */
/* ===================================================================== */

const SECTIONS = [
  { id: "hero", label: "Início" },
  { id: "carta", label: "Carta" },
  { id: "contexto", label: "Contexto" },
  { id: "solucao", label: "Solução" },
  { id: "escopo", label: "Escopo" },
  { id: "investimento", label: "Investimento" },
  { id: "cronograma", label: "Cronograma" },
  { id: "sobre", label: "GetBrain" },
  { id: "proximos", label: "Próximos passos" },
] as const;

function ProposalView({
  proposal,
  onDownloadPdf,
  isPreview,
  accessJwt,
}: {
  proposal: PublicProposal;
  onDownloadPdf: () => void;
  isPreview: boolean;
  accessJwt: string | null;
}) {
  const brand = proposal.client_brand_color || DEFAULT_BRAND;
  const itemsTotal = useMemo(
    () => proposal.items.reduce((acc, it) => acc + Number(it.total ?? 0), 0),
    [proposal.items],
  );
  // Valor de investimento: prioriza coluna implementation_value;
  // fallback para soma dos itens se não estiver definido.
  const total = Number(proposal.implementation_value ?? 0) > 0
    ? Number(proposal.implementation_value)
    : itemsTotal;
  const installments = Number(proposal.installments_count ?? 0);
  const installmentValue = installments > 1 ? total / installments : 0;
  const clientLabel = proposal.client_name || proposal.client_company_name;
  const firstName = proposal.recipient_first_name || null;
  const [interestSent, setInterestSent] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("hero");
  const [scrolled, setScrolled] = useState(false);

  // Carta IA + Roadmap IA
  const [openingLetter, setOpeningLetter] = useState<string | null>(
    proposal.public_opening_letter,
  );
  const [letterLoading, setLetterLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<PublicProposal["public_roadmap"]>(
    proposal.public_roadmap,
  );
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const sessionToken = useMemo(
    () => getOrCreateSessionToken(proposal.code),
    [proposal.code],
  );
  const startedAt = useRef(Date.now());
  const expiresInDays = daysUntil(proposal.expires_at);

  useEffect(() => {
    if (isPreview || !accessJwt) return;
    trackEvent(accessJwt, "view", { __session: sessionToken });
    const beforeUnload = () => {
      const dur = Math.round((Date.now() - startedAt.current) / 1000);
      navigator.sendBeacon?.(
        `${SUPABASE_URL}/functions/v1/track-proposal-view`,
        new Blob(
          [
            JSON.stringify({
              event: "view",
              session_token: sessionToken,
              metadata: { duration_seconds: dur },
            }),
          ],
          { type: "application/json" },
        ),
      );
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isPreview, accessJwt, sessionToken]);

  // scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [proposal.code]);

  // header background after scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-gera carta IA + roadmap se ainda não estiverem em cache
  useEffect(() => {
    if (!accessJwt) return;
    if (!openingLetter && !letterLoading) {
      setLetterLoading(true);
      callEdge("generate-proposal-opening-letter", {}, accessJwt)
        .then((r) => {
          if (r.ok && r.data?.letter) setOpeningLetter(r.data.letter as string);
        })
        .finally(() => setLetterLoading(false));
    }
    if (!roadmap && !roadmapLoading && proposal.items.length > 0) {
      setRoadmapLoading(true);
      callEdge("generate-proposal-roadmap", {}, accessJwt)
        .then((r) => {
          if (r.ok && r.data?.roadmap) setRoadmap(r.data.roadmap);
        })
        .finally(() => setRoadmapLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessJwt]);

  // reveal-on-scroll
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [proposal.code]);

  function handleManifestInterest() {
    if (interestSent) {
      toast.info("Daniel já foi avisado!");
      return;
    }
    if (isPreview || !accessJwt) return;
    setInterestSent(true);
    trackEvent(accessJwt, "interest_manifested", {
      __session: sessionToken,
      source: "cta_button",
    });
    toast.success("Pronto! Daniel foi avisado e te chama em breve.");
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const visibleSections = SECTIONS.filter((s) => {
    if (s.id === "hero") return true;
    if (s.id === "carta") return true; // sempre exibida (IA gera mesmo sem executive_summary)
    if (s.id === "contexto") return !!proposal.pain_context;
    if (s.id === "solucao") return !!proposal.solution_overview;
    if (s.id === "escopo") return proposal.items.length > 0;
    if (s.id === "investimento") return proposal.items.length > 0;
    if (s.id === "cronograma") return (proposal.implementation_days ?? 0) > 0 || (proposal.validation_days ?? 0) > 0;
    if (s.id === "sobre") return true;
    if (s.id === "proximos") return true;
    return true;
  });

  const greeting = firstName ? `Olá, ${firstName}.` : `Olá.`;

  return (
    <div
      className="min-h-screen bg-[#0a0e1a] text-white antialiased font-editorial-body"
      style={{ ["--brand" as any]: brand } as React.CSSProperties}
    >
      <style>{`
        .font-editorial-display { font-family: 'Fraunces', Georgia, serif; font-feature-settings: 'ss01', 'ss02'; }
        .font-editorial-body { font-family: 'Inter Tight', system-ui, sans-serif; }
        .font-mono-display { font-family: 'JetBrains Mono', monospace; }

        .reveal { opacity: 0; transform: translateY(28px); transition: opacity 1s cubic-bezier(.2,.7,.2,1), transform 1s cubic-bezier(.2,.7,.2,1); }
        .reveal-in { opacity: 1; transform: none; }

        .text-brand { color: var(--brand); }
        .bg-brand { background: var(--brand); }
        .border-brand { border-color: var(--brand); }
        .ring-brand { --tw-ring-color: var(--brand); }
        .brand-dot::after { content: ''; display: inline-block; width: .35em; height: .35em; border-radius: 9999px; background: var(--brand); margin-left: .15em; vertical-align: middle; transform: translateY(.3em); }

        .hairline { background: linear-gradient(to right, transparent, rgba(255,255,255,.18), transparent); height: 1px; }
        .hairline-dark { background: linear-gradient(to right, transparent, rgba(10,14,26,.18), transparent); height: 1px; }

        .editorial-hero-bg {
          background:
            radial-gradient(ellipse 800px 600px at 30% 40%, color-mix(in srgb, var(--brand) 22%, transparent) 0%, transparent 60%),
            radial-gradient(ellipse 600px 500px at 80% 70%, rgba(59,130,246,.18) 0%, transparent 60%),
            linear-gradient(180deg, #0a0e1a 0%, #0f1525 100%);
        }
        .grain::before {
          content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        .scroll-line { position: relative; width: 1px; height: 60px; background: rgba(255,255,255,.15); overflow: hidden; }
        .scroll-line::after {
          content: ''; position: absolute; left: 0; top: -60px; width: 100%; height: 60px;
          background: linear-gradient(to bottom, transparent, var(--brand));
          animation: scrollDown 2.4s cubic-bezier(.6,.1,.4,1) infinite;
        }
        @keyframes scrollDown { 0% { transform: translateY(0); } 100% { transform: translateY(120px); } }

        .dot-nav-btn { position: relative; }
        .dot-nav-btn .dot { width: 6px; height: 6px; border-radius: 9999px; background: rgba(255,255,255,.25); transition: all .3s; }
        .dot-nav-btn.active .dot, .dot-nav-btn:hover .dot { background: var(--brand); transform: scale(1.6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 22%, transparent); }
        .dot-nav-btn .label { position: absolute; right: 18px; top: 50%; transform: translateY(-50%); white-space: nowrap; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.6); opacity: 0; transition: opacity .25s; }
        .dot-nav-btn:hover .label, .dot-nav-btn.active .label { opacity: 1; }

        /* Light section */
        .editorial-light { background: #f5f3ee; color: #0a0e1a; }
        .editorial-light .text-muted-ink { color: #5a6271; }
        .editorial-light .border-ink { border-color: rgba(10,14,26,.12); }

        .underline-mark {
          background-image: linear-gradient(to top, color-mix(in srgb, var(--brand) 35%, transparent) 38%, transparent 38%);
          padding: 0 .15em;
        }
      `}</style>

      {isPreview && (
        <div className="sticky top-0 z-[60] bg-amber-400 text-amber-950 px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow">
          <Eye className="h-3.5 w-3.5" />
          Pré-visualização interna · o cliente verá esta página exatamente assim
        </div>
      )}

      {/* TOP NAV */}
      <header
        className={`fixed left-0 right-0 z-50 transition-all duration-500 ${
          isPreview ? "top-[34px]" : "top-0"
        } ${scrolled ? "backdrop-blur-xl bg-[#0a0e1a]/85 border-b border-white/5" : "bg-transparent"}`}
      >
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-5 flex items-center gap-4">
          <button
            onClick={() => scrollTo("hero")}
            className="flex items-center gap-3 min-w-0 group"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-sm text-white flex-shrink-0">
              G
            </div>
            <div className="min-w-0 text-left">
              <div className="text-[9px] font-mono-display uppercase tracking-[0.3em] text-white/40 leading-none">
                Proposta
              </div>
              <div className="text-sm font-mono-display font-medium truncate leading-tight mt-1 text-white/90">
                {proposal.code}
              </div>
            </div>
          </button>
          <div className="flex-1" />
          <span className="hidden md:flex items-center gap-2 text-[11px] font-mono-display uppercase tracking-[0.25em] text-white/40 truncate max-w-[320px]">
            Para <span className="text-white/85 normal-case font-editorial-body tracking-normal text-sm font-medium truncate">{clientLabel}</span>
          </span>
          <button
            onClick={onDownloadPdf}
            className="group inline-flex items-center gap-2 text-xs font-mono-display uppercase tracking-[0.2em] text-white/70 hover:text-white border border-white/15 hover:border-white/40 rounded-full px-4 py-2 transition-all"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </header>

      {/* DOT NAV (desktop) */}
      <nav className="hidden xl:flex flex-col gap-5 fixed right-8 top-1/2 -translate-y-1/2 z-40">
        {visibleSections.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className={`dot-nav-btn flex items-center justify-end ${activeSection === s.id ? "active" : ""}`}
            aria-label={s.label}
          >
            <span className="label">{s.label}</span>
            <span className="dot" />
          </button>
        ))}
      </nav>

      {/* ============================ HERO ============================ */}
      <section
        id="hero"
        className="relative editorial-hero-bg grain min-h-screen flex flex-col scroll-mt-0 overflow-hidden"
      >
        <div className="relative flex-1 flex flex-col justify-center max-w-[1400px] mx-auto w-full px-6 sm:px-10 pt-32 pb-24">
          {/* Eyebrow + logo cliente */}
          <div className="reveal flex items-center gap-4 mb-12">
            {proposal.client_logo_url ? (
              <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  src={proposal.client_logo_url}
                  alt={`Logo ${clientLabel}`}
                  className="max-h-10 max-w-10 object-contain"
                />
              </div>
            ) : (
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center text-slate-900 font-bold text-lg flex-shrink-0"
                style={{ background: brand }}
              >
                {clientLabel.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] font-mono-display uppercase tracking-[0.4em] text-white/45 mb-1">
                Proposta exclusiva para
              </div>
              <div className="text-base font-medium text-white/90 truncate">{clientLabel}</div>
            </div>
          </div>

          {/* Headline serif gigante */}
          <h1 className="reveal font-editorial-display font-light tracking-tight leading-[1.02] text-[44px] sm:text-[72px] lg:text-[108px] xl:text-[128px] max-w-[15ch]">
            <span className="brand-dot">{proposal.title || clientLabel}</span>
          </h1>

          {/* Eyebrow filosofal */}
          <div className="reveal mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-mono-display uppercase tracking-[0.35em] text-white/55">
            <span>Estratégia</span>
            <span className="text-white/20">·</span>
            <span>Tecnologia</span>
            <span className="text-white/20">·</span>
            <span>Resultado</span>
          </div>

          {/* Sub */}
          <p className="reveal mt-10 text-lg sm:text-xl text-white/65 leading-relaxed max-w-2xl font-light">
            {proposal.welcome_message ||
              `Esta proposta foi escrita exclusivamente para ${clientLabel}. Reserve alguns minutos — ela conta uma história.`}
          </p>

          {/* CTAs */}
          <div className="reveal mt-12 flex flex-wrap items-center gap-3">
            <button
              onClick={() => scrollTo(visibleSections[1]?.id || "proximos")}
              className="group inline-flex items-center gap-3 bg-white text-slate-900 hover:bg-white/90 transition-all rounded-full pl-6 pr-5 h-12 font-medium text-sm"
            >
              Explorar proposta
              <span className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
            <button
              onClick={onDownloadPdf}
              className="inline-flex items-center gap-2 text-sm font-mono-display uppercase tracking-[0.2em] text-white/70 hover:text-white border border-white/15 hover:border-white/40 rounded-full px-5 h-12 transition-all"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        </div>

        {/* KPIs editorial na base */}
        <div className="relative max-w-[1400px] mx-auto w-full px-6 sm:px-10 pb-12">
          <div className="hairline mb-8" />
          <div className="reveal grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-10">
            <KpiEditorial
              label="Investimento"
              value={formatBRL(total)}
              brand={brand}
            />
            {!!proposal.maintenance_monthly_value && proposal.maintenance_monthly_value > 0 && (
              <KpiEditorial
                label="Mensalidade"
                value={`${formatBRL(Number(proposal.maintenance_monthly_value))}`}
                suffix="/mês"
              />
            )}
            {!!proposal.implementation_days && (
              <KpiEditorial
                label="Implementação"
                value={`${proposal.implementation_days}`}
                suffix=" dias"
              />
            )}
            {expiresInDays !== null && (
              <KpiEditorial
                label="Válida até"
                value={formatDate(proposal.expires_at)}
                suffix={` · ${expiresInDays}d`}
              />
            )}
          </div>
        </div>

        {/* Scroll cue */}
        <div className="relative pb-12 flex flex-col items-center gap-4 text-white/45">
          <span className="text-[9px] font-mono-display uppercase tracking-[0.4em]">Role para baixo</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* ============================ CARTA DE ABERTURA (IA) ============================ */}
      <section id="carta" className="editorial-light scroll-mt-16">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-32 sm:py-44 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-3">
            <div className="reveal text-[10px] font-mono-display uppercase tracking-[0.4em] text-muted-ink flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-brand" />
              <span>Carta de Daniel</span>
            </div>
            <div className="reveal hidden lg:block mt-6 text-xs text-muted-ink/70 leading-relaxed font-light max-w-[18ch]">
              Escrita especialmente para {clientLabel}.
            </div>
          </div>
          <div className="lg:col-span-8 lg:col-start-5">
            <p className="reveal font-editorial-display text-3xl sm:text-5xl lg:text-6xl leading-[1.15] tracking-tight font-light">
              {greeting}
            </p>
            <div className="reveal mt-10 min-h-[120px]">
              {openingLetter ? (
                <div className="prose prose-lg max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-p:font-light prose-p:text-[1.15rem] prose-strong:text-slate-900">
                  {openingLetter.split(/\n\n+/).map((para, i) => (
                    <p key={i}>{para.trim()}</p>
                  ))}
                </div>
              ) : letterLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-900/8 rounded w-[95%]" />
                  <div className="h-4 bg-slate-900/8 rounded w-[88%]" />
                  <div className="h-4 bg-slate-900/8 rounded w-[92%]" />
                  <div className="h-4 bg-slate-900/8 rounded w-[60%]" />
                  <div className="text-[10px] font-mono-display uppercase tracking-[0.3em] text-brand pt-3 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Daniel está escrevendo...
                  </div>
                </div>
              ) : proposal.executive_summary ? (
                <div className="prose prose-lg max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-p:font-light prose-strong:text-slate-900">
                  <ReactMarkdown>{proposal.executive_summary}</ReactMarkdown>
                </div>
              ) : null}
            </div>
            <div className="reveal mt-12 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-white">
                D
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Daniel</div>
                <div className="text-xs text-muted-ink">Fundador · GetBrain</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ CONTEXTO ============================ */}
      {proposal.pain_context && (
        <EditorialSection
          id="contexto"
          number="01"
          eyebrow="Contexto"
          title="O ponto de partida"
          theme="dark"
        >
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-2">
              <div className="reveal sticky top-32 font-editorial-display text-7xl sm:text-9xl text-white/10 leading-none">
                "
              </div>
            </div>
            <div className="lg:col-span-10">
              <Prose markdown={proposal.pain_context} dark />
            </div>
          </div>
        </EditorialSection>
      )}

      {/* ============================ SOLUÇÃO ============================ */}
      {proposal.solution_overview && (
        <EditorialSection
          id="solucao"
          number="02"
          eyebrow="Solução"
          title="O que vamos construir"
          theme="light"
        >
          <Prose markdown={proposal.solution_overview} />
        </EditorialSection>
      )}

      {/* ============================ ESCOPO ============================ */}
      {proposal.items.length > 0 && (
        <EditorialSection
          id="escopo"
          number="03"
          eyebrow="Escopo"
          title="Capítulos da entrega"
          theme="dark"
        >
          <div className="space-y-0">
            {proposal.items.map((item, idx) => (
              <ScopeChapter key={item.id} item={item} index={idx} />
            ))}
            <div className="hairline mt-2" />
          </div>
        </EditorialSection>
      )}

      {/* ============================ INVESTIMENTO ============================ */}
      {proposal.items.length > 0 && (
        <section id="investimento" className="editorial-light scroll-mt-16">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-32 sm:py-44">
            <div className="reveal mb-16">
              <div className="text-[10px] font-mono-display uppercase tracking-[0.4em] text-muted-ink mb-4">
                <span className="text-brand">04 ·</span> Investimento
              </div>
              <h2 className="font-editorial-display text-4xl sm:text-6xl lg:text-7xl tracking-tight font-light leading-[1.05]">
                <span className="brand-dot">Os números</span>
              </h2>
            </div>

            <div className="grid lg:grid-cols-12 gap-12">
              {/* Total monumental */}
              <div className="lg:col-span-5 reveal">
                <div className="text-[10px] font-mono-display uppercase tracking-[0.3em] text-muted-ink mb-4">
                  Investimento total
                </div>
                <div className="font-editorial-display text-6xl sm:text-7xl lg:text-[88px] leading-none tracking-tight tabular-nums">
                  {formatBRL(total)}
                </div>
                {!!proposal.maintenance_monthly_value && proposal.maintenance_monthly_value > 0 && (
                  <div className="mt-6 text-muted-ink">
                    <span className="text-[10px] font-mono-display uppercase tracking-[0.3em]">+ Mensalidade</span>
                    <div className="font-editorial-display text-3xl mt-1 tabular-nums">
                      {formatBRL(Number(proposal.maintenance_monthly_value))}<span className="text-base text-muted-ink">/mês</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabela editorial */}
              <div className="lg:col-span-7 reveal">
                <div className="text-[10px] font-mono-display uppercase tracking-[0.3em] text-muted-ink mb-6">
                  Composição
                </div>
                <ul className="divide-y divide-slate-900/10">
                  {proposal.items.map((it, i) => (
                    <li key={it.id} className="py-5 flex items-baseline gap-4">
                      <span className="font-mono-display text-xs text-muted-ink w-8 flex-shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-slate-900">{it.description}</span>
                      <span className="font-mono-display tabular-nums text-slate-900 font-medium whitespace-nowrap">
                        {Number(it.total) > 0 ? formatBRL(Number(it.total)) : "incluso"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Manutenção: o que está incluso */}
            {!!proposal.maintenance_monthly_value && proposal.maintenance_monthly_value > 0 && proposal.maintenance_description && (
              <div className="reveal mt-20 grid lg:grid-cols-12 gap-12 pt-16 border-t border-ink">
                <div className="lg:col-span-3">
                  <div className="text-[10px] font-mono-display uppercase tracking-[0.4em] text-muted-ink">
                    <span className="text-brand">—</span> Mensalidade inclui
                  </div>
                </div>
                <div className="lg:col-span-8 lg:col-start-5">
                  <ul className="space-y-3 text-slate-700">
                    {proposal.maintenance_description.split(/\n|[,+]/).map((s, i) => {
                      const t = s.trim();
                      if (!t) return null;
                      return (
                        <li key={i} className="flex items-baseline gap-4 border-b border-slate-900/8 pb-3">
                          <span className="font-mono-display text-[10px] text-brand mt-1">+</span>
                          <span className="flex-1">{t}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================ CRONOGRAMA ============================ */}
      {((proposal.implementation_days ?? 0) > 0 || (proposal.validation_days ?? 0) > 0) && (
        <EditorialSection
          id="cronograma"
          number="05"
          eyebrow="Cronograma"
          title="A jornada"
          theme="dark"
        >
          <RoadmapTimeline
            roadmap={roadmap}
            loading={roadmapLoading}
            brand={brand}
          />
          <div className="mt-16 pt-12 border-t border-white/10">
            <div className="text-[10px] font-mono-display uppercase tracking-[0.3em] text-white/45 mb-6">
              Visão macro do prazo
            </div>
            <CronogramaEditorial
              implementationDays={proposal.implementation_days ?? 0}
              validationDays={proposal.validation_days ?? 0}
              brand={brand}
            />
          </div>
        </EditorialSection>
      )}

      {/* ============================ MOCKUP ============================ */}
      {proposal.mockup_url && (
        <EditorialSection
          number="06"
          eyebrow="Protótipo"
          title="Veja antes de existir"
          theme="light"
        >
          <div className="reveal flex flex-wrap items-center justify-between gap-6">
            <p className="text-slate-700 max-w-xl text-lg font-light leading-relaxed">
              Preparamos uma versão interativa para você navegar pelo que está sendo proposto.
            </p>
            <a
              href={proposal.mockup_url}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-3 bg-slate-900 text-white hover:bg-slate-800 transition-all rounded-full pl-6 pr-5 h-12 font-medium text-sm"
            >
              Abrir protótipo
              <span className="h-7 w-7 rounded-full bg-white text-slate-900 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </a>
          </div>
        </EditorialSection>
      )}

      {/* ============================ CONSIDERAÇÕES ============================ */}
      {proposal.considerations.length > 0 && (
        <EditorialSection
          number="07"
          eyebrow="Considerações"
          title="Antes de avançar"
          theme="dark"
        >
          <ol className="reveal divide-y divide-white/10">
            {proposal.considerations.map((c, i) => (
              <li key={i} className="py-6 flex items-baseline gap-6">
                <span className="font-mono-display text-xs text-brand w-10 flex-shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-white/75 leading-relaxed flex-1">{c}</span>
              </li>
            ))}
          </ol>
        </EditorialSection>
      )}

      {/* ============================ SOBRE GETBRAIN ============================ */}
      <EditorialSection
        id="sobre"
        number="08"
        eyebrow="Sobre"
        title="GetBrain"
        theme="light"
      >
        <div className="reveal max-w-3xl space-y-6 text-slate-700 text-lg leading-relaxed font-light">
          {ABOUT_GETBRAIN_PARAGRAPHS.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </EditorialSection>

      {/* ============================ PRÓXIMOS PASSOS ============================ */}
      <section id="proximos" className="relative editorial-hero-bg grain scroll-mt-16 overflow-hidden">
        <div className="relative max-w-[1400px] mx-auto px-6 sm:px-10 py-32 sm:py-44">
          <div className="reveal text-[10px] font-mono-display uppercase tracking-[0.4em] text-white/45 mb-6">
            <span className="text-brand">—</span> Próximos passos
          </div>
          <h2 className="reveal font-editorial-display text-5xl sm:text-7xl lg:text-8xl tracking-tight font-light leading-[1.05] max-w-[18ch]">
            <span className="brand-dot">Vamos começar?</span>
          </h2>
          <p className="reveal mt-8 text-lg text-white/65 max-w-2xl font-light leading-relaxed">
            Se essa proposta faz sentido, é só avisar — o Daniel é chamado na hora.
            Se quiser ajustar algo ou tirar uma dúvida, fale pelo WhatsApp ou pelo
            chat aqui no canto.
          </p>

          <div className="reveal mt-12 flex flex-wrap gap-3">
            <button
              onClick={handleManifestInterest}
              disabled={interestSent || isPreview}
              className="group inline-flex items-center gap-3 bg-white text-slate-900 hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all rounded-full pl-6 pr-5 h-13 py-4 font-medium text-sm"
            >
              <ThumbsUp className="h-4 w-4" />
              {interestSent ? "Daniel foi avisado" : "Quero avançar"}
              <span className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
            <a
              href={buildWhatsappUrl(`Olá Daniel, quero avançar com a proposta ${proposal.code}`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-mono-display uppercase tracking-[0.2em] text-white/70 hover:text-white border border-white/15 hover:border-white/40 rounded-full px-5 h-12 transition-all"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </div>

          <div className="hairline mt-24 mb-12" />

          <div className="flex flex-wrap items-end gap-8 justify-between text-white/55">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-white text-xl">
                D
              </div>
              <div>
                <div className="text-white text-base font-medium">Daniel</div>
                <div className="text-xs font-mono-display uppercase tracking-[0.2em]">Fundador · GetBrain</div>
              </div>
            </div>
            <div className="text-xs font-mono-display uppercase tracking-[0.2em]">
              Proposta {proposal.code}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#070a13] border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-14 grid sm:grid-cols-2 gap-10 items-end">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-sm text-white">
                G
              </div>
              <span className="font-bold tracking-tight text-white">GetBrain</span>
            </div>
            <p className="text-xs text-white/40 font-mono-display uppercase tracking-[0.2em]">
              Preparada exclusivamente para {clientLabel}
            </p>
          </div>
          <div className="sm:text-right">
            <div className="text-[10px] font-mono-display uppercase tracking-[0.3em] text-white/35 mb-2">
              Contato
            </div>
            <a href={`https://wa.me/${GETBRAIN_INFO.whatsapp}`} target="_blank" rel="noreferrer" className="block text-sm text-white/70 hover:text-white transition-colors">
              WhatsApp do Daniel
            </a>
            <a href="mailto:daniel@getbrain.com.br" className="block text-sm text-white/70 hover:text-white transition-colors">
              daniel@getbrain.com.br
            </a>
          </div>
        </div>
        <div className="border-t border-white/5">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-6 text-[10px] font-mono-display uppercase tracking-[0.25em] text-white/30 flex flex-wrap gap-3 justify-between">
            <span>© {new Date().getFullYear()} GetBrain</span>
            <span>getbrain.com.br</span>
          </div>
        </div>
      </footer>

      {/* CHAT IA — bolinha flutuante */}
      <ProposalChatBubble
        brand={brand}
        disabled={isPreview}
        accessJwt={accessJwt}
        sessionToken={sessionToken}
        proposalCode={proposal.code}
        clientFirstName={firstName}
        onManifestInterest={handleManifestInterest}
      />
    </div>
  );
}

/* ===================================================================== */
/*                              COMPONENTES                              */
/* ===================================================================== */

function EditorialSection({
  id,
  number,
  eyebrow,
  title,
  children,
  theme,
}: {
  id?: string;
  number: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  theme: "dark" | "light";
}) {
  const isLight = theme === "light";
  return (
    <section
      id={id}
      className={`scroll-mt-16 ${isLight ? "editorial-light" : "bg-[#0a0e1a] text-white"}`}
    >
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-32 sm:py-44">
        <div className="reveal mb-16 grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
            <div
              className={`text-[10px] font-mono-display uppercase tracking-[0.4em] ${
                isLight ? "text-muted-ink" : "text-white/45"
              }`}
            >
              <span className="text-brand">{number} ·</span> {eyebrow}
            </div>
          </div>
          <div className="lg:col-span-9">
            <h2 className="font-editorial-display text-4xl sm:text-6xl lg:text-7xl tracking-tight font-light leading-[1.05]">
              <span className="brand-dot">{title}</span>
            </h2>
          </div>
        </div>
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-9 lg:col-start-4">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiEditorial({
  label,
  value,
  suffix,
  brand,
}: {
  label: string;
  value: string;
  suffix?: string;
  brand?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-mono-display uppercase tracking-[0.3em] text-white/45">
        {label}
      </div>
      <div className="font-editorial-display text-2xl sm:text-3xl tabular-nums leading-none">
        <span className={brand ? "text-brand" : ""}>{value}</span>
        {suffix && <span className="text-white/55 text-base font-editorial-body font-light">{suffix}</span>}
      </div>
    </div>
  );
}

function Prose({ markdown, dark }: { markdown: string; dark?: boolean }) {
  return (
    <div
      className={
        dark
          ? "reveal prose prose-invert prose-lg max-w-none prose-p:text-white/75 prose-p:leading-relaxed prose-p:font-light prose-strong:text-white prose-li:text-white/75 prose-a:text-brand"
          : "reveal prose prose-lg max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-p:font-light prose-strong:text-slate-900 prose-li:text-slate-700 prose-a:text-brand"
      }
    >
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}

function ScopeChapter({
  item,
  index,
}: {
  item: PublicProposal["items"][number];
  index: number;
}) {
  const longText = item.long_description || item.detailed_description || null;
  const hasDetails =
    !!longText ||
    item.deliverables.length > 0 ||
    item.acceptance_criteria.length > 0 ||
    item.client_dependencies.length > 0;
  const [open, setOpen] = useState(false);

  return (
    <div className="reveal border-t border-white/10">
      <button
        type="button"
        onClick={() => hasDetails && setOpen((v) => !v)}
        className="w-full text-left py-8 sm:py-10 flex items-baseline gap-6 sm:gap-10 group"
        disabled={!hasDetails}
      >
        <span className="font-mono-display text-xs text-brand flex-shrink-0 w-12 pt-2">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-editorial-display text-2xl sm:text-3xl lg:text-4xl font-light leading-[1.15] tracking-tight">
            {item.description}
          </h3>
          {longText && !open && (
            <p className="mt-3 text-white/55 text-sm sm:text-base font-light leading-relaxed line-clamp-2 max-w-3xl">
              {longText.replace(/[#*_>`-]/g, "").trim()}
            </p>
          )}
        </div>
        {hasDetails && (
          <span className="flex-shrink-0 h-10 w-10 rounded-full border border-white/15 group-hover:border-brand group-hover:text-brand text-white/60 flex items-center justify-center transition-all">
            {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </span>
        )}
      </button>
      {open && hasDetails && (
        <div className="pb-12 pl-0 sm:pl-[88px] grid lg:grid-cols-2 gap-10 animate-fade-in">
          {longText && (
            <div className="lg:col-span-2 prose prose-invert prose-lg max-w-none prose-p:text-white/75 prose-p:leading-relaxed prose-p:font-light prose-strong:text-white">
              <ReactMarkdown>{longText}</ReactMarkdown>
            </div>
          )}
          {item.deliverables.length > 0 && (
            <div>
              <div className="text-[10px] font-mono-display uppercase tracking-[0.3em] text-brand mb-4">
                Entregáveis
              </div>
              <ul className="space-y-2">
                {item.deliverables.map((d, i) => (
                  <li key={i} className="flex items-baseline gap-3 text-white/80 border-b border-white/8 pb-2">
                    <span className="font-mono-display text-[10px] text-brand">+</span>
                    <span className="flex-1">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.acceptance_criteria.length > 0 && (
            <div>
              <div className="text-[10px] font-mono-display uppercase tracking-[0.3em] text-brand mb-4">
                Critérios de aceite
              </div>
              <ol className="space-y-2">
                {item.acceptance_criteria.map((c, i) => (
                  <li key={i} className="flex items-baseline gap-3 text-white/80 border-b border-white/8 pb-2">
                    <span className="font-mono-display text-[10px] text-brand w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1">{c}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {item.client_dependencies.length > 0 && (
            <div className="lg:col-span-2">
              <div className="text-[10px] font-mono-display uppercase tracking-[0.3em] text-amber-400 mb-4">
                Depende de você
              </div>
              <ul className="space-y-2">
                {item.client_dependencies.map((d, i) => (
                  <li key={i} className="flex items-baseline gap-3 text-white/80 border-b border-white/8 pb-2">
                    <span className="font-mono-display text-[10px] text-amber-400">!</span>
                    <span className="flex-1">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CronogramaEditorial({
  implementationDays,
  validationDays,
  brand,
}: {
  implementationDays: number;
  validationDays: number;
  brand: string;
}) {
  const total = implementationDays + validationDays;
  return (
    <div className="reveal">
      <div className="grid sm:grid-cols-3 gap-8 mb-12">
        <div>
          <div className="text-[10px] font-mono-display uppercase tracking-[0.3em] text-white/45 mb-3">
            Início
          </div>
          <div className="font-editorial-display text-3xl sm:text-4xl tabular-nums">D+0</div>
        </div>
        <div>
          <div className="text-[10px] font-mono-display uppercase tracking-[0.3em] text-white/45 mb-3">
            Duração total
          </div>
          <div className="font-editorial-display text-3xl sm:text-4xl tabular-nums text-brand">
            {total} <span className="text-white/55 text-xl font-editorial-body font-light">dias</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono-display uppercase tracking-[0.3em] text-white/45 mb-3">
            Entrega
          </div>
          <div className="font-editorial-display text-3xl sm:text-4xl tabular-nums">D+{total}</div>
        </div>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden border border-white/10">
        {implementationDays > 0 && (
          <div
            style={{ background: brand, flex: implementationDays }}
            title={`Implementação · ${implementationDays}d`}
          />
        )}
        {validationDays > 0 && (
          <div
            style={{ background: `${brand}55`, flex: validationDays }}
            title={`Validação · ${validationDays}d`}
          />
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-6 text-xs font-mono-display uppercase tracking-[0.2em] text-white/55">
        {implementationDays > 0 && (
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: brand }} />
            Implementação · {implementationDays}d
          </span>
        )}
        {validationDays > 0 && (
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: `${brand}55` }} />
            Validação · {validationDays}d
          </span>
        )}
      </div>
    </div>
  );
}
