ALTER TABLE public.movimentacoes
ADD COLUMN IF NOT EXISTS colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_colaborador_id ON public.movimentacoes(colaborador_id);