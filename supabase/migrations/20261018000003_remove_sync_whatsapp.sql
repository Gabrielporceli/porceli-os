-- Sincronização de conversas do WhatsApp (função sync-whatsapp) desativada a
-- pedido: não estava em uso. As mensagens continuam entrando pelo webhook
-- (webhook-messages); os dados já sincronizados (conversations, contatos)
-- permanecem.
SELECT cron.unschedule('sync-whatsapp-lote') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-whatsapp-lote');
DELETE FROM public.automations WHERE jobname = 'sync-whatsapp-lote';
DELETE FROM public.cron_runs WHERE job = 'sync-whatsapp-lote';
