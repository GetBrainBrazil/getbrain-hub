/**
 * Valores padrão (fallback) para o conteúdo institucional da página pública.
 * Usados quando a tabela `public_page_settings` ainda não retornou dados ou
 * quando rendering acontece antes do load (ex.: SSR, primeiro paint).
 *
 * Os valores aqui são espelho do `INSERT` default da migração — mantenha
 * sincronizado se mudar um dos dois.
 */
export interface PublicPageSettings {
  hero_eyebrows: string[];
  hero_scroll_cue: string;
  section_eyebrows: Record<string, string>;
  section_titles: Record<string, string>;
  about_paragraphs: string[];
  capabilities: { icon: string; title: string; description: string }[];
  tech_stack: string[];
  next_steps_title: string;
  next_steps_paragraphs: string[];
  footer_tagline: string;
  footer_contact_label: string;
  password_gate_title: string;
  password_gate_subtitle: string;
  password_gate_button: string;
  contact_whatsapp: string | null;
  contact_email: string | null;
  contact_display_name: string | null;
}

export const DEFAULT_PAGE_SETTINGS: PublicPageSettings = {
  hero_eyebrows: ["Estratégia", "Tecnologia", "Resultado"],
  hero_scroll_cue: "Role para baixo",
  section_eyebrows: {
    carta: "Abertura",
    contexto: "Contexto",
    solucao: "Solução",
    escopo: "Escopo",
    investimento: "Investimento",
    cronograma: "Cronograma",
    sobre: "Quem faz",
    proximos: "Próximos passos",
  },
  section_titles: {
    carta: "Uma palavra antes de começar",
    contexto: "O ponto de partida",
    solucao: "A solução que propomos",
    escopo: "O que vamos construir",
    investimento: "Os números",
    cronograma: "A jornada",
    sobre: "Sobre a GetBrain",
    proximos: "Vamos começar?",
  },
  about_paragraphs: [
    "A GetBrain é uma consultoria de inovação tecnológica focada em construir soluções sob medida para empresas que querem ganhar velocidade e eficiência operacional.",
    "Combinamos design, engenharia de software e automação inteligente para entregar plataformas que se integram à rotina dos times — sem cerimônia, sem ferramentas que ninguém usa.",
    "Cada projeto é tratado como uma parceria de longo prazo: do diagnóstico inicial à manutenção evolutiva, mantendo um único ponto focal com Daniel e equipe enxuta para garantir contexto e qualidade.",
  ],
  capabilities: [
    { icon: "Brain", title: "Estratégia", description: "Diagnóstico de fluxos e arquitetura da solução antes de uma linha de código." },
    { icon: "Code2", title: "Engenharia", description: "Stack moderno, código próprio e infraestrutura preparada para escalar." },
    { icon: "Workflow", title: "Automação", description: "Integrações com IA e fluxos sob medida que tiram trabalho repetitivo do time." },
    { icon: "Layers", title: "Design", description: "Interfaces que o time realmente usa — clareza acima de penduricalhos." },
    { icon: "Sparkles", title: "Iteração", description: "Entregas curtas com feedback contínuo — sem caixa-preta." },
    { icon: "Users", title: "Parceria", description: "Ponto focal único com Daniel e time enxuto, contexto preservado." },
  ],
  tech_stack: [
    "React", "TypeScript", "Node.js", "Python", "PostgreSQL", "Supabase",
    "Next.js", "Tailwind CSS", "OpenAI", "Anthropic", "Vercel", "Cloudflare",
    "Stripe", "n8n", "Figma", "Lovable", "Resend",
  ],
  next_steps_title: "Vamos começar?",
  next_steps_paragraphs: [
    'Se a proposta faz sentido pra você, basta clicar em "Quero avançar". Vamos receber uma notificação imediata e entrar em contato pra alinhar o kick-off.',
    "Se ainda tem dúvidas, fala com a gente pelo chat aqui ao lado ou pelo WhatsApp — respondemos rápido.",
  ],
  footer_tagline: "Consultoria de inovação tecnológica",
  footer_contact_label: "Falar com a gente",
  password_gate_title: "Proposta protegida",
  password_gate_subtitle: "Digite a senha que você recebeu junto com o link.",
  password_gate_button: "Acessar proposta",
  contact_whatsapp: null,
  contact_email: null,
  contact_display_name: null,
};

/** Merge raso seguro entre defaults e payload remoto (campo a campo). */
export function mergeWithDefaults(
  partial: Partial<PublicPageSettings> | null | undefined,
): PublicPageSettings {
  if (!partial) return DEFAULT_PAGE_SETTINGS;
  return {
    ...DEFAULT_PAGE_SETTINGS,
    ...partial,
    section_eyebrows: { ...DEFAULT_PAGE_SETTINGS.section_eyebrows, ...(partial.section_eyebrows || {}) },
    section_titles: { ...DEFAULT_PAGE_SETTINGS.section_titles, ...(partial.section_titles || {}) },
  };
}
