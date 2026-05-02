-- Tabela de motivos de descarte de Deal (catálogo editável pelo admin)
CREATE TABLE public.deal_lost_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#94a3b8',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_lost_reasons ENABLE ROW LEVEL SECURITY;

-- Leitura para qualquer usuário autenticado (usado em selects do funil)
CREATE POLICY "Authenticated read deal_lost_reasons"
ON public.deal_lost_reasons FOR SELECT
TO authenticated USING (true);

-- Mutações apenas para admin
CREATE POLICY "Admin manage deal_lost_reasons"
ON public.deal_lost_reasons FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_deal_lost_reasons_updated_at
BEFORE UPDATE ON public.deal_lost_reasons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seeds iniciais (system, não deletáveis pela UI)
INSERT INTO public.deal_lost_reasons (slug, label, description, color, sort_order, is_system) VALUES
  ('preco', 'Preço', 'Cliente considerou o investimento alto demais para o momento.', '#ef4444', 10, true),
  ('timing', 'Timing', 'Projeto adiado, sem janela de decisão no curto prazo.', '#f59e0b', 20, true),
  ('concorrente', 'Foi com concorrente', 'Cliente fechou com outro fornecedor.', '#a855f7', 30, true),
  ('sem_fit', 'Sem fit técnico', 'Necessidade do cliente fora do escopo da agência.', '#64748b', 40, true),
  ('sem_resposta', 'Sem resposta', 'Cliente parou de responder após apresentação da proposta.', '#94a3b8', 50, true),
  ('orcamento', 'Sem orçamento', 'Cliente não tinha verba aprovada para o projeto.', '#dc2626', 60, true)
ON CONFLICT (slug) DO NOTHING;