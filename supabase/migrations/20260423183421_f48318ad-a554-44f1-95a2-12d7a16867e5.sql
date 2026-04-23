ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date DATE;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE deleted_at IS NULL AND due_date IS NOT NULL;