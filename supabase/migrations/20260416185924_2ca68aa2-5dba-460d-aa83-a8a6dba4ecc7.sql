ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS desconto_previsto numeric DEFAULT 0;
ALTER TABLE public.anexos ADD COLUMN IF NOT EXISTS descricao text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('anexos-movimentacoes', 'anexos-movimentacoes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated read anexos-movimentacoes"
ON storage.objects FOR SELECT
USING (bucket_id = 'anexos-movimentacoes' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated insert anexos-movimentacoes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'anexos-movimentacoes' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update anexos-movimentacoes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'anexos-movimentacoes' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated delete anexos-movimentacoes"
ON storage.objects FOR DELETE
USING (bucket_id = 'anexos-movimentacoes' AND auth.uid() IS NOT NULL);