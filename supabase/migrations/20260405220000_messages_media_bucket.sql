-- Criar bucket público para mídias de mensagens enviadas
INSERT INTO storage.buckets (id, name, public)
VALUES ('messages-media', 'messages-media', true)
ON CONFLICT (id) DO NOTHING;

-- Política: qualquer usuário autenticado pode fazer upload
DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'messages-media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Política: leitura pública
DO $$ BEGIN
  CREATE POLICY "Public read access for messages-media"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'messages-media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Política: usuário pode deletar seus próprios arquivos
DO $$ BEGIN
  CREATE POLICY "Users can delete own media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'messages-media' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Agendar limpeza diária de mídias com mais de 30 dias (02:00 UTC)
SELECT cron.unschedule('cleanup-messages-media') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-messages-media'
);

SELECT cron.schedule(
  'cleanup-messages-media',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yopedcaueobmilnrcyfe.supabase.co/functions/v1/cleanup-media',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGVkY2F1ZW9ibWlsbnJjeWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQxMjMwMSwiZXhwIjoyMDY2OTg4MzAxfQ.0I-sz_ZUGjNzixd4gRtj6JV5x3mi3VO2RVyoZ-Im4B0"}'::jsonb
  ) as request_id;
  $$
);
