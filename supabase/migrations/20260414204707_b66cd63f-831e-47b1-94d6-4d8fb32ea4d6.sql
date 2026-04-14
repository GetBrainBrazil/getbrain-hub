-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Contas Bancárias
CREATE TABLE public.contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  tipo TEXT DEFAULT 'corrente' CHECK (tipo IN ('corrente', 'poupanca', 'investimento')),
  saldo_inicial NUMERIC(12,2) DEFAULT 0,
  cor TEXT DEFAULT '#3B82F6',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access contas_bancarias" ON public.contas_bancarias FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER update_contas_bancarias_updated_at BEFORE UPDATE ON public.contas_bancarias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Categorias
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa', 'ambos')),
  categoria_pai_id UUID REFERENCES public.categorias(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access categorias" ON public.categorias FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Meios de Pagamento
CREATE TABLE public.meios_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.meios_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access meios_pagamento" ON public.meios_pagamento FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Centros de Custo
CREATE TABLE public.centros_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access centros_custo" ON public.centros_custo FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo_pessoa TEXT DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  cpf_cnpj TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access clientes" ON public.clientes FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fornecedores
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo_pessoa TEXT DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  cpf_cnpj TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  categoria_servico TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access fornecedores" ON public.fornecedores FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Projetos
CREATE TABLE public.projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  descricao TEXT,
  valor_contrato NUMERIC(12,2),
  data_inicio DATE,
  data_fim DATE,
  status TEXT DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido', 'pausado', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access projetos" ON public.projetos FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER update_projetos_updated_at BEFORE UPDATE ON public.projetos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Movimentações Financeiras
CREATE TABLE public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  descricao TEXT NOT NULL,
  valor_previsto NUMERIC(12,2) NOT NULL,
  valor_realizado NUMERIC(12,2) DEFAULT 0,
  data_competencia DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  conciliado BOOLEAN DEFAULT false,
  cliente_id UUID REFERENCES public.clientes(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  projeto_id UUID REFERENCES public.projetos(id),
  categoria_id UUID REFERENCES public.categorias(id),
  centro_custo_id UUID REFERENCES public.centros_custo(id),
  conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  meio_pagamento_id UUID REFERENCES public.meios_pagamento(id),
  recorrente BOOLEAN DEFAULT false,
  frequencia_recorrencia TEXT CHECK (frequencia_recorrencia IN ('mensal', 'trimestral', 'semestral', 'anual')),
  movimentacao_pai_id UUID REFERENCES public.movimentacoes(id),
  parcelado BOOLEAN DEFAULT false,
  parcela_atual INTEGER,
  total_parcelas INTEGER,
  pis NUMERIC(12,2) DEFAULT 0,
  cofins NUMERIC(12,2) DEFAULT 0,
  csll NUMERIC(12,2) DEFAULT 0,
  iss NUMERIC(12,2) DEFAULT 0,
  ir NUMERIC(12,2) DEFAULT 0,
  inss NUMERIC(12,2) DEFAULT 0,
  juros NUMERIC(12,2) DEFAULT 0,
  multa NUMERIC(12,2) DEFAULT 0,
  taxas_adm NUMERIC(12,2) DEFAULT 0,
  observacoes TEXT,
  tags TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access movimentacoes" ON public.movimentacoes FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER update_movimentacoes_updated_at BEFORE UPDATE ON public.movimentacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_movimentacoes_tipo ON public.movimentacoes(tipo);
CREATE INDEX idx_movimentacoes_status ON public.movimentacoes(status);
CREATE INDEX idx_movimentacoes_vencimento ON public.movimentacoes(data_vencimento);
CREATE INDEX idx_movimentacoes_cliente ON public.movimentacoes(cliente_id);
CREATE INDEX idx_movimentacoes_projeto ON public.movimentacoes(projeto_id);
CREATE INDEX idx_movimentacoes_categoria ON public.movimentacoes(categoria_id);

-- Anexos
CREATE TABLE public.anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movimentacao_id UUID REFERENCES public.movimentacoes(id) ON DELETE CASCADE,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT,
  tamanho_bytes INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access anexos" ON public.anexos FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Orçamento
CREATE TABLE public.orcamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID REFERENCES public.categorias(id),
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor_orcado NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(categoria_id, ano, mes)
);
ALTER TABLE public.orcamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access orcamento" ON public.orcamento FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER update_orcamento_updated_at BEFORE UPDATE ON public.orcamento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for comprovantes
INSERT INTO storage.buckets (id, name, public) VALUES ('comprovantes', 'comprovantes', false);
CREATE POLICY "Authenticated users can upload comprovantes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'comprovantes' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view comprovantes" ON storage.objects FOR SELECT USING (bucket_id = 'comprovantes' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete comprovantes" ON storage.objects FOR DELETE USING (bucket_id = 'comprovantes' AND auth.uid() IS NOT NULL);

-- Function to auto-update overdue status
CREATE OR REPLACE FUNCTION public.update_status_atrasado()
RETURNS void AS $$
BEGIN
  UPDATE public.movimentacoes
  SET status = 'atrasado'
  WHERE status = 'pendente'
    AND data_vencimento < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SET search_path = public;