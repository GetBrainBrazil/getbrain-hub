-- Tabela singleton por organização para conteúdo editável da página pública
CREATE TABLE public.public_page_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,

  -- Hero
  hero_eyebrows text[] NOT NULL DEFAULT ARRAY['Estratégia','Tecnologia','Resultado'],
  hero_scroll_cue text NOT NULL DEFAULT 'Role para baixo',

  -- Títulos/eyebrows das seções (chaves: carta, contexto, solucao, escopo, investimento, cronograma, sobre, proximos)
  section_eyebrows jsonb NOT NULL DEFAULT '{
    "carta":"Abertura","contexto":"Contexto","solucao":"Solução",
    "escopo":"Escopo","investimento":"Investimento","cronograma":"Cronograma",
    "sobre":"Quem faz","proximos":"Próximos passos"
  }'::jsonb,
  section_titles jsonb NOT NULL DEFAULT '{
    "carta":"Uma palavra antes de começar",
    "contexto":"O ponto de partida",
    "solucao":"A solução que propomos",
    "escopo":"O que vamos construir",
    "investimento":"Os números",
    "cronograma":"A jornada",
    "sobre":"Sobre a GetBrain",
    "proximos":"Vamos começar?"
  }'::jsonb,

  -- Sobre a GetBrain (parágrafos editáveis)
  about_paragraphs text[] NOT NULL DEFAULT ARRAY[
    'A GetBrain é uma consultoria de inovação tecnológica focada em construir soluções sob medida para empresas que querem ganhar velocidade e eficiência operacional.',
    'Combinamos design, engenharia de software e automação inteligente para entregar plataformas que se integram à rotina dos times — sem cerimônia, sem ferramentas que ninguém usa.',
    'Cada projeto é tratado como uma parceria de longo prazo: do diagnóstico inicial à manutenção evolutiva, mantendo um único ponto focal com Daniel e equipe enxuta para garantir contexto e qualidade.'
  ],

  -- Cards de capacidades [{ icon, title, description }]
  capabilities jsonb NOT NULL DEFAULT '[
    {"icon":"Brain","title":"Estratégia","description":"Diagnóstico de fluxos e arquitetura da solução antes de uma linha de código."},
    {"icon":"Code2","title":"Engenharia","description":"Stack moderno, código próprio e infraestrutura preparada para escalar."},
    {"icon":"Workflow","title":"Automação","description":"Integrações com IA e fluxos sob medida que tiram trabalho repetitivo do time."},
    {"icon":"Layers","title":"Design","description":"Interfaces que o time realmente usa — clareza acima de penduricalhos."},
    {"icon":"Sparkles","title":"Iteração","description":"Entregas curtas com feedback contínuo — sem caixa-preta."},
    {"icon":"Users","title":"Parceria","description":"Ponto focal único com Daniel e time enxuto, contexto preservado."}
  ]'::jsonb,

  -- Stack tecnológico
  tech_stack text[] NOT NULL DEFAULT ARRAY[
    'React','TypeScript','Node.js','Python','PostgreSQL','Supabase',
    'Next.js','Tailwind CSS','OpenAI','Anthropic','Vercel','Cloudflare',
    'Stripe','n8n','Figma','Lovable','Resend'
  ],

  -- Próximos passos (CTA final)
  next_steps_title text NOT NULL DEFAULT 'Vamos começar?',
  next_steps_paragraphs text[] NOT NULL DEFAULT ARRAY[
    'Se a proposta faz sentido pra você, basta clicar em "Quero avançar". Vamos receber uma notificação imediata e entrar em contato pra alinhar o kick-off.',
    'Se ainda tem dúvidas, fala com a gente pelo chat aqui ao lado ou pelo WhatsApp — respondemos rápido.'
  ],

  -- Footer
  footer_tagline text NOT NULL DEFAULT 'Consultoria de inovação tecnológica',
  footer_contact_label text NOT NULL DEFAULT 'Falar com a gente',

  -- Tela de senha
  password_gate_title text NOT NULL DEFAULT 'Proposta protegida',
  password_gate_subtitle text NOT NULL DEFAULT 'Digite a senha que você recebeu junto com o link.',
  password_gate_button text NOT NULL DEFAULT 'Acessar proposta',

  -- Contatos globais (override opcional do GETBRAIN_INFO)
  contact_whatsapp text,
  contact_email text,
  contact_display_name text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.public_page_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_settings_select_auth"
ON public.public_page_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "page_settings_insert_admin"
ON public.public_page_settings
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "page_settings_update_admin"
ON public.public_page_settings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "page_settings_delete_admin"
ON public.public_page_settings
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER trg_public_page_settings_updated_at
BEFORE UPDATE ON public.public_page_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed inicial para a organização principal
INSERT INTO public.public_page_settings (organization_id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (organization_id) DO NOTHING;
