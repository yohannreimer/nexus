-- ================================================
-- MIGRATION: Adicionar coluna is_automated na tabela clients
-- ================================================
-- Esta coluna controla se o cliente recebe relatórios
-- automáticos no horário configurado
-- ================================================

-- Adicionar coluna is_automated para controlar envio automático
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT FALSE;

-- Criar índice para busca rápida de clientes automatizados
CREATE INDEX IF NOT EXISTS idx_clients_is_automated 
ON public.clients(is_automated) 
WHERE is_automated = true;

-- Comentário
COMMENT ON COLUMN public.clients.is_automated IS 'Se true, envia relatório automaticamente no horário configurado';
