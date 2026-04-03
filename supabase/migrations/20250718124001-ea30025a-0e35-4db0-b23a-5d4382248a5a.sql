
-- Adicionar campos para suporte a mídia na tabela de mensagens
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS media_type TEXT,
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_filename TEXT,
ADD COLUMN IF NOT EXISTS media_size BIGINT;

-- Adicionar comentários para documentar os novos campos
COMMENT ON COLUMN public.messages.media_type IS 'Tipo de mídia: image, audio, video, document, etc.';
COMMENT ON COLUMN public.messages.media_url IS 'URL do arquivo de mídia';
COMMENT ON COLUMN public.messages.media_filename IS 'Nome original do arquivo';
COMMENT ON COLUMN public.messages.media_size IS 'Tamanho do arquivo em bytes';
