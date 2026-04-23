-- 1. Adicionar campos em tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS labels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_tasks_labels ON public.tasks USING GIN (labels) WHERE deleted_at IS NULL;

-- 2. Tabela task_comments
CREATE TABLE IF NOT EXISTS public.task_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT public.getbrain_org_id() REFERENCES public.organizations(id),
  task_id         UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id        UUID NOT NULL REFERENCES public.actors(id),
  body            TEXT NOT NULL,
  edited_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT task_comment_body_not_empty CHECK (LENGTH(TRIM(body)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_comments_actor ON public.task_comments(actor_id) WHERE deleted_at IS NULL;

-- updated_at trigger (usa set_updated_at já existente)
DROP TRIGGER IF EXISTS task_comments_updated_at ON public.task_comments;
CREATE TRIGGER task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- edited_at trigger
CREATE OR REPLACE FUNCTION public.set_comment_edited_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.body IS DISTINCT FROM NEW.body THEN
    NEW.edited_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_comments_set_edited_at ON public.task_comments;
CREATE TRIGGER task_comments_set_edited_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_comment_edited_at();

-- RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_comments_authenticated ON public.task_comments;
CREATE POLICY task_comments_authenticated ON public.task_comments
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);