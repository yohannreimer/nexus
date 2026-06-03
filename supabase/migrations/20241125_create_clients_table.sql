-- ================================================
-- MIGRATION: Criar tabela clients
-- ================================================

-- Criar função de update se não existir
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar tabela clients se não existir
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ad_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  whatsapp_number TEXT,
  report_time TEXT DEFAULT '09:00',
  report_period TEXT DEFAULT 'yesterday',
  template_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, ad_account_id)
);

-- Index para busca rápida
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_ad_account_id ON public.clients(ad_account_id);

-- RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário só pode ver/editar seus próprios clientes
DROP POLICY IF EXISTS "Users can manage own clients" ON public.clients;
CREATE POLICY "Users can manage own clients"
  ON public.clients
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role pode fazer tudo
DROP POLICY IF EXISTS "Service role has full access to clients" ON public.clients;
CREATE POLICY "Service role has full access to clients"
  ON public.clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.clients IS 'Configurações de clientes por conta de anúncio';
COMMENT ON COLUMN public.clients.user_id IS 'ID do usuário no Supabase Auth';
COMMENT ON COLUMN public.clients.ad_account_id IS 'ID da conta de anúncio do Facebook';
