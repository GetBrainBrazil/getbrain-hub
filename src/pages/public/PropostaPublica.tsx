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
  Sparkles,
  ThumbsUp,
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
const DEFAULT_BRAND = "#06b6d4";

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
    return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
  } catch {
    return iso;
  }
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
    />
  );
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 py-5">
        <span className="font-bold text-slate-900 tracking-tight text-lg">
          GetBrain
        </span>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 bg-white border-slate-200 shadow-lg">
          <div className="space-y-1 mb-6">
            <h1 className="text-xl font-bold text-slate-900">
              Esta proposta é protegida
            </h1>
            <p className="text-sm text-slate-600">
              Digite a senha que você recebeu junto com o link.
            </p>
          </div>
          {props.expiredOn ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 flex gap-2">
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
                  placeholder="Senha"
                  autoFocus
                  className="pr-10 bg-white border-slate-300 text-slate-900"
                />
                <button
                  type="button"
                  onClick={props.onToggleShow}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {props.showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {props.authError && (
                <p className="text-xs text-red-600">{props.authError}</p>
              )}
              <Button
                type="submit"
                disabled={props.loading || !props.password}
                className="w-full"
              >
                {props.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Acessar
              </Button>
            </form>
          )}
        </Card>
      </main>
      <footer className="text-center py-4 text-xs text-slate-500">
        Problemas?{" "}
        <a
          href="https://wa.me/5511999999999"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-slate-700"
        >
          Fale com a GetBrain
        </a>
      </footer>
    </div>
  );
}

/* ------------------------- VISUALIZAÇÃO DOCUMENT-STYLE ------------------------- */

function ProposalView({
  proposal,
  onDownloadPdf,
  isPreview,
}: {
  proposal: PublicProposal;
  onDownloadPdf: () => void;
  isPreview: boolean;
}) {
  const brand = proposal.client_brand_color || DEFAULT_BRAND;
  const total = useMemo(
    () => proposal.items.reduce((acc, it) => acc + Number(it.total ?? 0), 0),
    [proposal.items],
  );
  const clientLabel = proposal.client_name || proposal.client_company_name;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {isPreview && (
        <div
          className="sticky top-0 z-50 bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2"
        >
          <Eye className="h-3.5 w-3.5" />
          Pré-visualização interna · o cliente verá esta página exatamente assim
        </div>
      )}

      {/* HEADER sticky minimalista */}
      <header
        className={`sticky ${isPreview ? "top-[34px]" : "top-0"} z-40 bg-white/95 backdrop-blur transition-shadow ${
          scrolled ? "shadow-sm border-b border-slate-200" : ""
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          {proposal.client_logo_url ? (
            <img
              src={proposal.client_logo_url}
              alt={`Logo ${clientLabel}`}
              className="h-8 max-h-[40px] w-auto object-contain"
            />
          ) : (
            <div
              className="h-8 w-8 rounded flex items-center justify-center text-white font-semibold text-xs"
              style={{ background: brand }}
            >
              {clientLabel.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 leading-tight">
              Proposta
            </div>
            <div className="text-sm font-semibold text-slate-900 truncate leading-tight">
              {clientLabel}
            </div>
          </div>
          <span className="hidden sm:inline font-mono text-[11px] text-slate-400">
            {proposal.code}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={onDownloadPdf}
            className="text-xs"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </header>

      {/* CONTEÚDO — fluxo único, document-style */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-16">
        {/* Hero */}
        <section className="space-y-6">
          {proposal.title && (
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              {proposal.title}
            </h1>
          )}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Preparada por GetBrain</span>
            <span>·</span>
            <span>Válida até {formatDate(proposal.expires_at)}</span>
          </div>
          <div className="text-lg text-slate-700 leading-relaxed pt-2">
            {proposal.welcome_message ||
              `Olá! Esta é a proposta preparada especialmente para ${clientLabel}.`}
          </div>
        </section>

        {/* Resumo executivo */}
        {proposal.executive_summary && (
          <Block title="Resumo executivo" brand={brand}>
            <Prose markdown={proposal.executive_summary} />
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Highlight label="Investimento total" value={formatBRL(total)} brand={brand} />
              {!!proposal.maintenance_monthly_value && proposal.maintenance_monthly_value > 0 && (
                <Highlight
                  label="Manutenção mensal"
                  value={formatBRL(Number(proposal.maintenance_monthly_value))}
                  brand={brand}
                />
              )}
              {!!proposal.implementation_days && (
                <Highlight
                  label="Implementação"
                  value={`${proposal.implementation_days} dias`}
                  brand={brand}
                />
              )}
            </div>
          </Block>
        )}

        {/* Sobre */}
        <Block title="Sobre a GetBrain" brand={brand}>
          <div className="space-y-4">
            {ABOUT_GETBRAIN_PARAGRAPHS.map((p, i) => (
              <p key={i} className="text-slate-700 leading-relaxed">{p}</p>
            ))}
          </div>
        </Block>

        {/* Contexto */}
        {proposal.pain_context && (
          <Block title="O contexto" brand={brand}>
            <Prose markdown={proposal.pain_context} />
          </Block>
        )}

        {/* Solução */}
        {proposal.solution_overview && (
          <Block title="A solução" brand={brand}>
            <Prose markdown={proposal.solution_overview} />
          </Block>
        )}

        {/* Escopo */}
        {proposal.items.length > 0 && (
          <Block title="Módulos da proposta" brand={brand}>
            <div className="space-y-3">
              {proposal.items.map((item, idx) => (
                <ItemCard key={item.id} item={item} brand={brand} defaultOpen={idx === 0} />
              ))}
            </div>
          </Block>
        )}

        {/* Manutenção */}
        {!!proposal.maintenance_monthly_value && proposal.maintenance_monthly_value > 0 && (
          <Block title="Manutenção mensal" brand={brand}>
            <Card className="p-5 border-slate-200">
              <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                <span className="text-sm text-slate-600">Mensalidade</span>
                <span className="text-2xl font-bold" style={{ color: brand }}>
                  {formatBRL(Number(proposal.maintenance_monthly_value))}
                  <span className="text-sm font-normal text-slate-500 ml-1">/mês</span>
                </span>
              </div>
              {proposal.maintenance_description && (
                <ul className="space-y-1.5 text-sm text-slate-700">
                  {proposal.maintenance_description.split(/\n|[,+]/).map((s, i) => {
                    const t = s.trim();
                    if (!t) return null;
                    return (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2
                          className="h-4 w-4 mt-0.5 flex-shrink-0"
                          style={{ color: brand }}
                        />
                        <span>{t}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </Block>
        )}

        {/* Cronograma */}
        <Block title="Cronograma" brand={brand}>
          <Timeline
            implementationDays={proposal.implementation_days ?? 0}
            validationDays={proposal.validation_days ?? 0}
            brand={brand}
          />
        </Block>

        {/* Investimento */}
        {proposal.items.length > 0 && (
          <Block title="Investimento" brand={brand}>
            <Card className="overflow-hidden border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Item</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-slate-600 w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.items.map((it) => (
                      <tr key={it.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-800">{it.description}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                          {formatBRL(Number(it.total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2" style={{ borderColor: brand }}>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">Total one-time</td>
                      <td className="px-4 py-3 text-right tabular-nums text-lg font-bold" style={{ color: brand }}>
                        {formatBRL(total)}
                      </td>
                    </tr>
                    {!!proposal.maintenance_monthly_value && proposal.maintenance_monthly_value > 0 && (
                      <tr>
                        <td className="px-4 py-2 text-right text-slate-600 text-sm">+ Manutenção mensal</td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-700">
                          {formatBRL(Number(proposal.maintenance_monthly_value))}/mês
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </Card>
          </Block>
        )}

        {/* Considerações */}
        {proposal.considerations.length > 0 && (
          <Block title="Considerações" brand={brand}>
            <ul className="space-y-2.5">
              {proposal.considerations.map((c, i) => (
                <li key={i} className="flex gap-3 text-slate-700">
                  <span className="text-slate-400 font-mono text-sm pt-0.5">{i + 1}.</span>
                  <span className="leading-relaxed">{c}</span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {/* Mockup */}
        {proposal.mockup_url && (
          <Block title="Mockup / Protótipo" brand={brand}>
            <Card
              className="p-6 border-slate-200"
              style={{ borderLeftWidth: 4, borderLeftColor: brand }}
            >
              <h3 className="text-lg font-semibold mb-2 text-slate-900">
                Veja o protótipo do seu sistema
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Preparamos uma versão navegável para você explorar a proposta visualmente.
              </p>
              <Button
                asChild
                size="lg"
                style={{ background: brand, color: "white" }}
              >
                <a href={proposal.mockup_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> Abrir protótipo
                </a>
              </Button>
            </Card>
          </Block>
        )}

        {/* Próximos passos */}
        <Block title="Próximos passos" brand={brand}>
          <Card className="p-6 border-slate-200 bg-slate-50">
            <p className="text-slate-700 mb-4">
              Para avançar com esta proposta, fale direto com Daniel — pelo chat
              abaixo ou pelo WhatsApp.
            </p>
            <Button
              asChild
              size="lg"
              style={{ background: brand, color: "white" }}
            >
              <a
                href={`https://wa.me/5511999999999?text=${encodeURIComponent(
                  `Olá Daniel, quero avançar com a proposta ${proposal.code}`,
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> Falar pelo WhatsApp
              </a>
            </Button>
          </Card>
        </Block>
      </article>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-6 text-center text-xs text-slate-500 space-y-1">
        <p>Esta proposta foi preparada exclusivamente para {clientLabel}.</p>
        <p>GetBrain · getbrain.com.br · © {new Date().getFullYear()}</p>
      </footer>

      {/* CHAT BAR — placeholder (ativo no 10C-3) */}
      <ChatPlaceholder brand={brand} disabled={isPreview} />
    </div>
  );
}

/* ------------------------- AUX ------------------------- */

function Block({
  title,
  brand,
  children,
}: {
  title: string;
  brand: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl font-bold mb-5 flex items-center gap-3 text-slate-900">
        <span className="h-6 w-1.5 rounded" style={{ background: brand }} />
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function Prose({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-p:text-slate-700">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}

function Highlight({ label, value, brand }: { label: string; value: string; brand: string }) {
  return (
    <div
      className="rounded-lg p-4 border"
      style={{ borderColor: `${brand}40`, background: `${brand}08` }}
    >
      <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-bold tabular-nums" style={{ color: brand }}>{value}</div>
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
  const total = (implementationDays || 0) + (validationDays || 0);
  return (
    <div className="space-y-4">
      <div className="flex items-stretch gap-1 rounded overflow-hidden h-12 border border-slate-200">
        <div
          className="flex items-center justify-center text-white text-xs font-semibold px-3"
          style={{ background: brand, flex: implementationDays || 1 }}
        >
          Implementação · {implementationDays}d
        </div>
        <div
          className="flex items-center justify-center text-white text-xs font-semibold px-3"
          style={{ background: `${brand}aa`, flex: validationDays || 1 }}
        >
          Validação · {validationDays}d
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>Início</span>
        <span>Total: {total} dias</span>
        <span>Entrega</span>
      </div>
    </div>
  );
}

function ItemCard({
  item,
  brand,
  defaultOpen,
}: {
  item: PublicProposal["items"][number];
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
    <Card
      className="overflow-hidden border-slate-200"
      style={{ borderLeftWidth: 4, borderLeftColor: brand }}
    >
      <button
        type="button"
        onClick={() => hasDetails && setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
        disabled={!hasDetails}
      >
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900">{item.description}</div>
        </div>
        <div className="text-right">
          <div className="font-bold tabular-nums text-slate-900">{formatBRL(Number(item.total))}</div>
          {hasDetails && (
            <div className="text-[10px] text-slate-500 mt-0.5">
              {open ? "▲ Recolher" : "▼ Detalhes"}
            </div>
          )}
        </div>
      </button>
      {open && hasDetails && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50/50">
          {item.detailed_description && <Prose markdown={item.detailed_description} />}
          {item.deliverables.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Entregáveis</h4>
              <ul className="space-y-1.5">
                {item.deliverables.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: brand }} />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.acceptance_criteria.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Critérios de aceite</h4>
              <ol className="space-y-1.5 list-decimal list-inside">
                {item.acceptance_criteria.map((c, i) => (
                  <li key={i} className="text-sm text-slate-700">{c}</li>
                ))}
              </ol>
            </div>
          )}
          {item.client_dependencies.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Dependências do cliente</h4>
              <ul className="space-y-1.5">
                {item.client_dependencies.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/** Chat bar placeholder — fica fixa no rodapé. Será ativada em 10C-3. */
function ChatPlaceholder({ brand, disabled }: { brand: string; disabled: boolean }) {
  return (
    <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 flex-shrink-0" style={{ color: brand }} />
        <Input
          disabled
          placeholder={
            disabled
              ? "Chat desabilitado em modo preview"
              : "Em breve: tire dúvidas sobre esta proposta direto aqui"
          }
          className="flex-1 bg-slate-50 border-slate-200 text-slate-500 text-sm cursor-not-allowed"
        />
        <Button size="icon" variant="ghost" disabled className="flex-shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
