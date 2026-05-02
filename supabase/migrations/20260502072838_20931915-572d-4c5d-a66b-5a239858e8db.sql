-- 1. Adicionar colunas de cache de IA na proposta
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS public_opening_letter text,
  ADD COLUMN IF NOT EXISTS public_roadmap jsonb;

-- 2. Adicionar phone do Daniel se faltando (sem sobrescrever se já existir)
UPDATE public.humans SET phone = '5521973818244' WHERE email = 'daniel@getbrain.com.br' AND (phone IS NULL OR phone = '');

-- 3. Adicionar novo estágio "com_interesse" ao enum deal_stage
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'deal_stage'::regtype AND enumlabel = 'com_interesse') THEN
    ALTER TYPE public.deal_stage ADD VALUE 'com_interesse' AFTER 'ajustando';
  END IF;
END $$;

-- 4. Tabela de destinatários de notificações de proposta (configurável)
CREATE TABLE IF NOT EXISTS public.proposal_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  human_id uuid REFERENCES public.humans(id) ON DELETE CASCADE,
  -- ou contato avulso (se human_id NULL)
  name text,
  email text,
  phone text,
  -- canais habilitados
  notify_email boolean NOT NULL DEFAULT true,
  notify_whatsapp boolean NOT NULL DEFAULT true,
  -- tipos de eventos (subset de notification kinds)
  events text[] NOT NULL DEFAULT ARRAY['first_view','manifested_interest','chat_started','chat_escalation']::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read recipients"
  ON public.proposal_notification_recipients FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admin manage recipients"
  ON public.proposal_notification_recipients FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Seed: Daniel como recipient padrão
INSERT INTO public.proposal_notification_recipients (organization_id, human_id, name, email, phone)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  h.id,
  COALESCE(a.display_name, 'Daniel'),
  h.email,
  COALESCE(h.phone, '5521973818244')
FROM public.humans h
LEFT JOIN public.actors a ON a.id = h.actor_id
WHERE h.email = 'daniel@getbrain.com.br'
  AND NOT EXISTS (
    SELECT 1 FROM public.proposal_notification_recipients r
    WHERE r.human_id = h.id
  );

CREATE INDEX IF NOT EXISTS idx_proposal_notif_recipients_org ON public.proposal_notification_recipients(organization_id) WHERE is_active;