-- Adiciona coluna para rastrear o ID do evento no Google Calendar
alter table public.sdr_meetings
  add column if not exists gcal_event_id text;
