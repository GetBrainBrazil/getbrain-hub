ALTER TABLE public.movimentacoes
  ADD CONSTRAINT movimentacoes_projeto_id_fkey
  FOREIGN KEY (projeto_id) REFERENCES public.projects(id) ON DELETE SET NULL;