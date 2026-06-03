-- ================================================
-- MIGRATION: Adicionar coluna selected_campaign_ids na tabela clients
-- ================================================
-- Esta coluna armazena os IDs das campanhas selecionadas para relatórios
-- ================================================

-- Adicionar coluna selected_campaign_ids (array de texto)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS selected_campaign_ids TEXT[] DEFAULT '{}';

-- Comentário
COMMENT ON COLUMN public.clients.selected_campaign_ids IS 'IDs das campanhas selecionadas para incluir nos relatórios';
