ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS template_key text NOT NULL DEFAULT 'anbi';

CREATE INDEX IF NOT EXISTS idx_proposals_template_key ON public.proposals(template_key);