-- 1. Rename template_key 'anbi' → 'inovacao_tecnologica'
UPDATE public.proposals
   SET template_key = 'inovacao_tecnologica',
       updated_at = now()
 WHERE template_key = 'anbi';

ALTER TABLE public.proposals
  ALTER COLUMN template_key SET DEFAULT 'inovacao_tecnologica';

DO $$
DECLARE v integer;
BEGIN
  SELECT COUNT(*) INTO v FROM public.proposals WHERE template_key = 'anbi';
  IF v > 0 THEN RAISE EXCEPTION 'Migracao incompleta: % propostas ainda com template_key=anbi', v; END IF;
END $$;

-- 2. Tabela proposal_versions
CREATE TABLE public.proposal_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  pdf_url text NOT NULL,
  pdf_storage_path text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, version_number)
);

CREATE INDEX idx_versions_proposal ON public.proposal_versions(proposal_id);
CREATE INDEX idx_versions_generated ON public.proposal_versions(generated_at DESC);

ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all_select" ON public.proposal_versions
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_all_insert" ON public.proposal_versions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_all_update" ON public.proposal_versions
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_all_delete" ON public.proposal_versions
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);