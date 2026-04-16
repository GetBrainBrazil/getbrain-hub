
-- Table to track import history
CREATE TABLE public.extrato_importacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  nome_arquivo TEXT NOT NULL,
  total_transacoes INTEGER NOT NULL DEFAULT 0,
  transacoes_conciliadas INTEGER NOT NULL DEFAULT 0,
  transacoes_criadas INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.extrato_importacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access extrato_importacoes"
  ON public.extrato_importacoes FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Table to store individual transactions from bank statements
CREATE TABLE public.extrato_transacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  importacao_id UUID NOT NULL REFERENCES public.extrato_importacoes(id) ON DELETE CASCADE,
  conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
  data_transacao DATE NOT NULL,
  descricao_banco TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  tipo TEXT NOT NULL, -- 'entrada' or 'saida'
  status_match TEXT NOT NULL DEFAULT 'sem_match', -- 'alto', 'medio', 'sem_match', 'conciliado', 'ignorado'
  movimentacao_id UUID REFERENCES public.movimentacoes(id) ON DELETE SET NULL,
  conciliado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.extrato_transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access extrato_transacoes"
  ON public.extrato_transacoes FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_extrato_transacoes_importacao ON public.extrato_transacoes(importacao_id);
CREATE INDEX idx_extrato_transacoes_conta ON public.extrato_transacoes(conta_bancaria_id);
CREATE INDEX idx_extrato_transacoes_movimentacao ON public.extrato_transacoes(movimentacao_id);
CREATE INDEX idx_extrato_importacoes_conta ON public.extrato_importacoes(conta_bancaria_id);
