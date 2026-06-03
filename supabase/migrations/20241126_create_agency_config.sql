-- ================================================
-- NEXUS AI - Agency Config Table
-- ================================================
-- Tabela para armazenar configurações da agência
-- ================================================

-- Criar tabela agency_config
CREATE TABLE IF NOT EXISTS public.agency_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT,
  logo TEXT,
  "primaryColor" TEXT DEFAULT '#6366f1',
  "secondaryColor" TEXT DEFAULT '#8b5cf6',
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  cnpj TEXT,
  "defaultSendTime" TEXT DEFAULT '08:00',
  "webhookUrl" TEXT,
  "reportFooter" TEXT DEFAULT 'Relatório gerado automaticamente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.agency_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own agency config" ON public.agency_config
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agency config" ON public.agency_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agency config" ON public.agency_config
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agency config" ON public.agency_config
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_agency_config_updated_at
  BEFORE UPDATE ON public.agency_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.agency_config TO anon, authenticated;

-- Index
CREATE INDEX idx_agency_config_user_id ON public.agency_config(user_id);
