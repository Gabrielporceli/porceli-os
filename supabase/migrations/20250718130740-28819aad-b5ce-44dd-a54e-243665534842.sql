
-- Criar bucket para armazenar as imagens descriptografadas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-media', 
  'whatsapp-media', 
  true, 
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/ogg', 'video/mp4', 'video/webm']
);

-- Criar política para permitir que usuários autenticados vejam arquivos
CREATE POLICY "Users can view media files" ON storage.objects
FOR SELECT USING (bucket_id = 'whatsapp-media');

-- Criar política para permitir que o backend insira arquivos
CREATE POLICY "Backend can upload media files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'whatsapp-media');

-- Criar política para permitir que o backend atualize arquivos
CREATE POLICY "Backend can update media files" ON storage.objects
FOR UPDATE USING (bucket_id = 'whatsapp-media');

-- Criar política para permitir que o backend delete arquivos
CREATE POLICY "Backend can delete media files" ON storage.objects
FOR DELETE USING (bucket_id = 'whatsapp-media');
