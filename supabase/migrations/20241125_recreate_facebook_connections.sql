-- ================================================
-- MIGRATION: Recriar tabela facebook_connections
-- ================================================
-- Esta migration recria a tabela facebook_connections com o schema correto
-- para funcionar com as Edge Functions
-- ================================================

-- 1. Dropar tabela antiga (e dependências)
DROP TABLE IF EXISTS public.facebook_connections CASCADE;

-- 2. Criar tabela com schema correto
CREATE TABLE public.facebook_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  facebook_user_id TEXT,
  facebook_name TEXT,
  facebook_email TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar índice para busca rápida por user_id
CREATE INDEX idx_facebook_connections_user_id ON public.facebook_connections(user_id);

-- 4. RLS (Row Level Security)
ALTER TABLE public.facebook_connections ENABLE ROW LEVEL SECURITY;

-- 5. Policy: Usuário só pode ver/editar suas próprias conexões
CREATE POLICY "Users can manage own facebook connections"
  ON public.facebook_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Policy: Service role pode fazer tudo (para Edge Functions)
CREATE POLICY "Service role has full access to facebook_connections"
  ON public.facebook_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_facebook_connections_updated_at ON public.facebook_connections;
CREATE TRIGGER update_facebook_connections_updated_at
  BEFORE UPDATE ON public.facebook_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Comentários
COMMENT ON TABLE public.facebook_connections IS 'Conexões do Facebook dos usuários';
COMMENT ON COLUMN public.facebook_connections.user_id IS 'ID do usuário no Supabase Auth';
COMMENT ON COLUMN public.facebook_connections.facebook_user_id IS 'ID do usuário no Facebook';
COMMENT ON COLUMN public.facebook_connections.access_token IS 'Token de acesso do Facebook (long-lived)';
