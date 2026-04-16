CREATE TABLE public.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cargo text,
  cpf text,
  emails text[] DEFAULT '{}',
  telefones text[] DEFAULT '{}',
  cep text,
  estado text,
  cidade text,
  endereco text,
  numero text,
  bairro text,
  complemento text,
  banco text,
  agencia text,
  conta text,
  tipo_conta text DEFAULT 'corrente',
  chaves_pix text[] DEFAULT '{}',
  data_admissao date,
  salario_base numeric DEFAULT 0,
  observacoes text,
  ativo boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access colaboradores"
  ON public.colaboradores
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER update_colaboradores_updated_at
  BEFORE UPDATE ON public.colaboradores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();