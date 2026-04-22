ALTER TABLE public.movimentacoes
  DROP CONSTRAINT IF EXISTS movimentacoes_movimentacao_pai_id_fkey;

ALTER TABLE public.movimentacoes
  ADD CONSTRAINT movimentacoes_movimentacao_pai_id_fkey
  FOREIGN KEY (movimentacao_pai_id)
  REFERENCES public.movimentacoes(id)
  ON DELETE SET NULL;