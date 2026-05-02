import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Loader2,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  ThumbsUp,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Calendar,
  Wallet,
  Clock,
  Lock,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ABOUT_GETBRAIN_PARAGRAPHS } from "@/content/about-getbrain";
import ProposalChatBox from "@/components/orcamentos/ProposalChatBox";

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
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    detailed_description: string | null;
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

  // Modo preview: usa JWT direto sem pedir senha
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
      {/* gradient orbs */}
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
              href="https://wa.me/5511999999999"
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

/* ------------------------- VISUALIZAÇÃO PREMIUM ------------------------- */

const SECTIONS = [
  { id: "hero", label: "Início" },
  { id: "resumo", label: "Resumo" },
  { id: "contexto", label: "Contexto" },
  { id: "solucao", label: "Solução" },
  { id: "escopo", label: "Escopo" },
  { id: "investimento", label: "Investimento" },
  { id: "cronograma", label: "Cronograma" },
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
  const total = useMemo(
    () => proposal.items.reduce((acc, it) => acc + Number(it.total ?? 0), 0),
    [proposal.items],
  );
  const clientLabel = proposal.client_name || proposal.client_company_name;
  const [interestSent, setInterestSent] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("hero");
  const sessionToken = useMemo(
    () => getOrCreateSessionToken(proposal.code),
    [proposal.code],
  );
  const startedAt = useRef(Date.now());
  const expiresInDays = daysUntil(proposal.expires_at);

  // Tracking de view + duração
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

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [proposal.code]);

  // Reveal-on-scroll para .reveal
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

  // Apenas seções com conteúdo aparecem na nav
  const visibleSections = SECTIONS.filter((s) => {
    if (s.id === "hero") return true;
    if (s.id === "resumo") return !!proposal.executive_summary;
    if (s.id === "contexto") return !!proposal.pain_context;
    if (s.id === "solucao") return !!proposal.solution_overview;
    if (s.id === "escopo") return proposal.items.length > 0;
    if (s.id === "investimento") return proposal.items.length > 0;
    if (s.id === "cronograma") return (proposal.implementation_days ?? 0) > 0 || (proposal.validation_days ?? 0) > 0;
    if (s.id === "proximos") return true;
    return true;
  });

  return (
    <div
      className="min-h-screen bg-[#0a0e1a] text-white antialiased"
      style={
        {
          // Variável local pro brand cliente
          ["--brand" as any]: brand,
        } as React.CSSProperties
      }
    >
      <style>{`
        .reveal { opacity: 0; transform: translateY(24px); transition: opacity .8s ease, transform .8s ease; }
        .reveal-in { opacity: 1; transform: none; }
        .text-brand { color: var(--brand); }
        .bg-brand { background: var(--brand); }
        .border-brand { border-color: var(--brand); }
        .ring-brand { --tw-ring-color: var(--brand); }
        .grad-brand { background: linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 40%, #6366f1 60%)); }
        .text-grad { background: linear-gradient(135deg, var(--brand) 0%, #ffffff 60%); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .scroll-fade::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 80px; background: linear-gradient(to top, #0a0e1a, transparent); pointer-events: none; }
      `}</style>

      {isPreview && (
        <div className="sticky top-0 z-[60] bg-amber-400 text-amber-950 px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow">
          <Eye className="h-3.5 w-3.5" />
          Pré-visualização interna · o cliente verá esta página exatamente assim
        </div>
      )}

      {/* TOP NAV PREMIUM */}
      <header className={`sticky ${isPreview ? "top-[34px]" : "top-0"} z-50 backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-white/5`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-sm text-white flex-shrink-0">
              G
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 leading-none">Proposta</div>
              <div className="text-sm font-semibold truncate leading-tight mt-0.5">{proposal.code}</div>
            </div>
          </div>
          <div className="flex-1" />
          <span className="hidden md:block text-xs text-white/50 truncate max-w-[280px]">
            Para <span className="text-white/80 font-medium">{clientLabel}</span>
          </span>
          <Button
            size="sm"
            onClick={onDownloadPdf}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:flex lg:gap-12">
        {/* SIDEBAR NAV */}
        <aside className="hidden lg:block w-44 flex-shrink-0 pt-32">
          <nav className="sticky top-32 space-y-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3 pl-3">
              Navegação
            </div>
            {visibleSections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={`w-full text-left text-xs pl-3 pr-2 py-1.5 rounded-md border-l-2 transition-all ${
                  activeSection === s.id
                    ? "border-brand text-white bg-white/5 font-medium"
                    : "border-transparent text-white/50 hover:text-white/80 hover:border-white/20"
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN */}
        <main className="flex-1 min-w-0 pb-32">
          {/* HERO */}
          <section
            id="hero"
            className="relative pt-16 sm:pt-24 pb-24 min-h-[80vh] flex flex-col justify-center"
          >
            {/* aurora */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="absolute -top-40 -left-20 w-[500px] h-[500px] rounded-full blur-[120px] opacity-40"
                style={{ background: brand }}
              />
              <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full blur-[140px] opacity-25 bg-blue-600" />
            </div>

            <div className="relative">
              {/* Logo cliente + label */}
              <div className="flex items-center gap-3 mb-8 reveal">
                {proposal.client_logo_url ? (
                  <img
                    src={proposal.client_logo_url}
                    alt={`Logo ${clientLabel}`}
                    className="h-10 max-h-[44px] w-auto object-contain"
                  />
                ) : (
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ background: brand }}
                  >
                    {clientLabel.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Preparada para</div>
                  <div className="text-sm font-medium text-white/90">{clientLabel}</div>
                </div>
              </div>

              {/* Título gigante */}
              <h1 className="reveal text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-8">
                <span className="block text-grad">
                  {proposal.title || "Vamos construir algo extraordinário"}
                </span>
              </h1>

              {/* Subtítulo / welcome */}
              <p className="reveal text-lg sm:text-xl text-white/70 max-w-2xl leading-relaxed mb-10">
                {proposal.welcome_message ||
                  `Olá! Esta é a proposta preparada exclusivamente para ${clientLabel}. Reserve alguns minutos — ela conta uma história.`}
              </p>

              {/* Pills com KPIs */}
              <div className="reveal flex flex-wrap gap-3 mb-12">
                <Pill icon={<Wallet className="h-3.5 w-3.5" />} label="Investimento" value={formatBRL(total)} highlight />
                {!!proposal.maintenance_monthly_value && proposal.maintenance_monthly_value > 0 && (
                  <Pill
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    label="Mensalidade"
                    value={`${formatBRL(Number(proposal.maintenance_monthly_value))}/mês`}
                  />
                )}
                {!!proposal.implementation_days && (
                  <Pill
                    icon={<Clock className="h-3.5 w-3.5" />}
                    label="Implementação"
                    value={`${proposal.implementation_days} dias`}
                  />
                )}
                {expiresInDays !== null && (
                  <Pill
                    icon={<Calendar className="h-3.5 w-3.5" />}
                    label="Válida até"
                    value={`${formatDate(proposal.expires_at)} · ${expiresInDays}d`}
                  />
                )}
              </div>

              {/* CTAs */}
              <div className="reveal flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => scrollTo(visibleSections[1]?.id || "proximos")}
                  className="grad-brand text-slate-900 hover:opacity-90 border-0 font-semibold h-12 px-6"
                >
                  Explorar proposta <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={onDownloadPdf}
                  className="border-white/20 bg-transparent hover:bg-white/5 text-white h-12 px-6"
                >
                  <Download className="h-4 w-4 mr-1" /> Baixar PDF
                </Button>
              </div>

              {/* Scroll indicator */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white/30 animate-bounce">
                <ChevronDown className="h-5 w-5" />
              </div>
            </div>
          </section>

          {/* RESUMO EXECUTIVO */}
          {proposal.executive_summary && (
            <Section id="resumo" eyebrow="01" title="Resumo executivo" brand={brand}>
              <Prose markdown={proposal.executive_summary} />
            </Section>
          )}

          {/* CONTEXTO */}
          {proposal.pain_context && (
            <Section id="contexto" eyebrow="02" title="O contexto" brand={brand}>
              <Prose markdown={proposal.pain_context} />
            </Section>
          )}

          {/* SOLUÇÃO */}
          {proposal.solution_overview && (
            <Section id="solucao" eyebrow="03" title="A solução" brand={brand}>
              <Prose markdown={proposal.solution_overview} />
            </Section>
          )}

          {/* ESCOPO */}
          {proposal.items.length > 0 && (
            <Section id="escopo" eyebrow="04" title="Escopo da entrega" brand={brand}>
              <div className="space-y-3">
                {proposal.items.map((item, idx) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    index={idx}
                    brand={brand}
                    defaultOpen={idx === 0}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* CRONOGRAMA */}
          {((proposal.implementation_days ?? 0) > 0 ||
            (proposal.validation_days ?? 0) > 0) && (
            <Section id="cronograma" eyebrow="05" title="Cronograma" brand={brand}>
              <Timeline
                implementationDays={proposal.implementation_days ?? 0}
                validationDays={proposal.validation_days ?? 0}
                brand={brand}
              />
            </Section>
          )}

          {/* INVESTIMENTO */}
          {proposal.items.length > 0 && (
            <Section id="investimento" eyebrow="06" title="Investimento" brand={brand}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden reveal">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/[0.03]">
                      <tr>
                        <th className="text-left px-5 py-3.5 font-medium text-[11px] uppercase tracking-wider text-white/50">Item</th>
                        <th className="text-right px-5 py-3.5 font-medium text-[11px] uppercase tracking-wider text-white/50 w-40">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.items.map((it) => (
                        <tr key={it.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                          <td className="px-5 py-4 text-white/85">{it.description}</td>
                          <td className="px-5 py-4 text-right tabular-nums font-semibold text-white">
                            {formatBRL(Number(it.total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-brand">
                        <td className="px-5 py-4 text-right font-medium text-white/70">Investimento total</td>
                        <td className="px-5 py-4 text-right tabular-nums text-2xl font-bold text-brand">
                          {formatBRL(total)}
                        </td>
                      </tr>
                      {!!proposal.maintenance_monthly_value && proposal.maintenance_monthly_value > 0 && (
                        <tr className="border-t border-white/5">
                          <td className="px-5 py-3 text-right text-white/60 text-sm">+ Manutenção mensal recorrente</td>
                          <td className="px-5 py-3 text-right tabular-nums font-semibold text-white/90">
                            {formatBRL(Number(proposal.maintenance_monthly_value))}/mês
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Manutenção em destaque */}
              {!!proposal.maintenance_monthly_value && proposal.maintenance_monthly_value > 0 && proposal.maintenance_description && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 reveal">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-brand mb-3">
                    O que está incluso na mensalidade
                  </h3>
                  <ul className="space-y-2 text-sm text-white/80">
                    {proposal.maintenance_description.split(/\n|[,+]/).map((s, i) => {
                      const t = s.trim();
                      if (!t) return null;
                      return (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-brand" />
                          <span>{t}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {/* MOCKUP */}
          {proposal.mockup_url && (
            <Section eyebrow="07" title="Veja o protótipo" brand={brand}>
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-8 reveal">
                <h3 className="text-2xl font-bold mb-2">Protótipo navegável</h3>
                <p className="text-white/60 mb-6 max-w-xl">
                  Preparamos uma versão interativa para você explorar visualmente o que está sendo proposto.
                </p>
                <Button
                  asChild
                  size="lg"
                  className="grad-brand text-slate-900 border-0 font-semibold"
                >
                  <a href={proposal.mockup_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" /> Abrir protótipo
                  </a>
                </Button>
              </div>
            </Section>
          )}

          {/* CONSIDERAÇÕES */}
          {proposal.considerations.length > 0 && (
            <Section eyebrow="08" title="Considerações importantes" brand={brand}>
              <ol className="space-y-4 reveal">
                {proposal.considerations.map((c, i) => (
                  <li key={i} className="flex gap-4 text-white/80">
                    <span
                      className="font-mono text-sm text-brand pt-1 flex-shrink-0 w-8"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-relaxed flex-1">{c}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* SOBRE GETBRAIN */}
          <Section eyebrow="09" title="Sobre a GetBrain" brand={brand}>
            <div className="space-y-4 text-white/70 reveal">
              {ABOUT_GETBRAIN_PARAGRAPHS.map((p, i) => (
                <p key={i} className="leading-relaxed">{p}</p>
              ))}
            </div>
          </Section>

          {/* PRÓXIMOS PASSOS — CTA hero */}
          <Section id="proximos" eyebrow="10" title="Próximos passos" brand={brand}>
            <div className="relative rounded-3xl overflow-hidden border border-white/10 reveal">
              <div className="absolute inset-0 grad-brand opacity-15" />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-600/10" />
              <div className="relative p-8 sm:p-12">
                <h3 className="text-3xl sm:text-4xl font-bold mb-3">
                  Vamos colocar isso em prática?
                </h3>
                <p className="text-white/70 mb-8 max-w-xl text-lg">
                  Curtiu a proposta? Avise o Daniel com 1 clique — ou tire dúvidas
                  direto no chat aqui no canto.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    onClick={handleManifestInterest}
                    disabled={interestSent || isPreview}
                    className="grad-brand text-slate-900 hover:opacity-90 border-0 font-semibold h-12 px-6"
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    {interestSent ? "Daniel foi avisado!" : "Quero avançar"}
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent hover:bg-white/5 text-white h-12 px-6">
                    <a
                      href={`https://wa.me/5511999999999?text=${encodeURIComponent(
                        `Olá Daniel, quero avançar com a proposta ${proposal.code}`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" /> Falar pelo WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </Section>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="relative border-t border-white/5 px-4 sm:px-8 py-10 text-center text-xs text-white/40 space-y-2">
        <p>Esta proposta foi preparada exclusivamente para <span className="text-white/70">{clientLabel}</span>.</p>
        <p>GetBrain · getbrain.com.br · © {new Date().getFullYear()}</p>
      </footer>

      {/* CHAT BAR — IA real */}
      <ProposalChatBox
        brand={brand}
        disabled={isPreview}
        accessJwt={accessJwt}
        sessionToken={sessionToken}
        proposalCode={proposal.code}
        onManifestInterest={handleManifestInterest}
      />
    </div>
  );
}

/* ------------------------- COMPONENTES AUX ------------------------- */

function Section({
  id,
  eyebrow,
  title,
  brand,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  brand: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="py-16 sm:py-20 scroll-mt-24">
      <div className="mb-8 reveal">
        {eyebrow && (
          <div
            className="text-xs font-mono tracking-widest mb-3 text-brand"
          >
            — {eyebrow}
          </div>
        )}
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          {title}
        </h2>
      </div>
      <div className="reveal">{children}</div>
    </section>
  );
}

function Prose({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-white/75 prose-p:leading-relaxed prose-strong:text-white prose-li:text-white/75 prose-a:text-brand">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}

function Pill({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border backdrop-blur-sm ${
        highlight
          ? "bg-white/8 border-brand/40"
          : "bg-white/[0.03] border-white/10"
      }`}
    >
      <div className={highlight ? "text-brand" : "text-white/50"}>{icon}</div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-white/50 leading-none">{label}</div>
        <div className={`text-sm font-semibold tabular-nums mt-0.5 ${highlight ? "text-brand" : "text-white"}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Timeline({
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
    <div className="space-y-4 reveal">
      <div className="flex items-stretch gap-1 rounded-xl overflow-hidden h-16 border border-white/10">
        {implementationDays > 0 && (
          <div
            className="flex items-center justify-center text-slate-900 text-sm font-semibold px-4"
            style={{ background: brand, flex: implementationDays }}
          >
            Implementação · {implementationDays}d
          </div>
        )}
        {validationDays > 0 && (
          <div
            className="flex items-center justify-center text-white text-sm font-semibold px-4"
            style={{ background: `${brand}50`, flex: validationDays }}
          >
            Validação · {validationDays}d
          </div>
        )}
      </div>
      <div className="flex justify-between text-xs text-white/40 px-1">
        <span>Início (D+0)</span>
        <span className="text-white/70 font-medium">Total: {total} dias</span>
        <span>Entrega (D+{total})</span>
      </div>
    </div>
  );
}

function ItemCard({
  item,
  index,
  brand,
  defaultOpen,
}: {
  item: PublicProposal["items"][number];
  index: number;
  brand: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasDetails =
    !!item.detailed_description ||
    item.deliverables.length > 0 ||
    item.acceptance_criteria.length > 0 ||
    item.client_dependencies.length > 0;

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-white/20 transition-colors reveal"
    >
      <button
        type="button"
        onClick={() => hasDetails && setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-white/[0.02] transition-colors"
        disabled={!hasDetails}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <span
            className="font-mono text-xs text-brand flex-shrink-0 w-8"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="font-semibold text-white truncate">{item.description}</div>
        </div>
        <div className="text-right flex items-center gap-3 flex-shrink-0">
          <div className="font-bold tabular-nums text-white text-base">{formatBRL(Number(item.total))}</div>
          {hasDetails && (
            <ChevronDown
              className={`h-4 w-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </button>
      {open && hasDetails && (
        <div className="border-t border-white/5 px-6 py-5 space-y-5 bg-black/20">
          {item.detailed_description && <Prose markdown={item.detailed_description} />}
          {item.deliverables.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-brand mb-3">Entregáveis</h4>
              <ul className="space-y-2">
                {item.deliverables.map((d, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-white/80">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-brand" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.acceptance_criteria.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-brand mb-3">Critérios de aceite</h4>
              <ol className="space-y-2 list-decimal list-inside text-sm text-white/80">
                {item.acceptance_criteria.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ol>
            </div>
          )}
          {item.client_dependencies.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3">Dependências do cliente</h4>
              <ul className="space-y-2">
                {item.client_dependencies.map((d, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-white/80">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
                    <span>{d}</span>
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
