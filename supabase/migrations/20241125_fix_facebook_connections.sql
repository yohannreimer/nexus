-- Migration: Adicionar índice único em user_id na tabela facebook_connections
-- Isso permite fazer upsert baseado apenas no user_id

-- Primeiro, remover duplicatas se houver (mantém o mais recente)
DELETE FROM public.facebook_connections a
USING public.facebook_connections b
WHERE a.id < b.id
AND a.user_id = b.user_id;

-- Agora podemos criar o índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_facebook_connections_user_id_unique 
ON public.facebook_connections(user_id);

-- Adicionar colunas que podem estar faltando
ALTER TABLE public.facebook_connections 
ADD COLUMN IF NOT EXISTS facebook_name TEXT;

ALTER TABLE public.facebook_connections 
ADD COLUMN IF NOT EXISTS facebook_email TEXT;

-- Comentário de documentação
COMMENT ON INDEX idx_facebook_connections_user_id_unique IS 'Permite apenas uma conexão Facebook por usuário';
