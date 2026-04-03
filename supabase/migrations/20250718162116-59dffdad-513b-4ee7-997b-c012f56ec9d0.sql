-- Criar políticas para o bucket whatsapp-media permitir acesso público para leitura
CREATE POLICY "Permitir leitura pública de mídia do WhatsApp" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'whatsapp-media');

-- Permitir inserção autenticada
CREATE POLICY "Permitir inserção autenticada de mídia do WhatsApp" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'whatsapp-media');

-- Permitir atualização autenticada
CREATE POLICY "Permitir atualização autenticada de mídia do WhatsApp" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'whatsapp-media');

-- Permitir exclusão autenticada
CREATE POLICY "Permitir exclusão autenticada de mídia do WhatsApp" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'whatsapp-media');