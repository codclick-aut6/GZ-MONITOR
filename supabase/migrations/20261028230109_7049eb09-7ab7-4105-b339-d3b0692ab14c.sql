-- lovable-cron-fallback-reviewed: inactivity close is time-based with no triggering event; user chose 20-min cadence
CREATE OR REPLACE FUNCTION public.increment_unread_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.sender_type = 'contact' OR (NEW.sender_type = 'human' AND NEW.sender_user_id IS NULL) THEN
    UPDATE public.whatsapp_sessions SET unread_count = unread_count + 1, updated_at = now()
    WHERE session_id = NEW.session_id;
  ELSIF NEW.sender_type = 'human' AND NEW.sender_user_id IS NOT NULL THEN
    UPDATE public.whatsapp_sessions SET unread_count = 0, updated_at = now() WHERE session_id = NEW.session_id;
  ELSE
    UPDATE public.whatsapp_sessions SET updated_at = now() WHERE session_id = NEW.session_id;
  END IF;
  RETURN NEW;
END; $function$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'fechar-sessoes-inativas-whatsapp',
  '*/20 * * * *',
  $$
    UPDATE public.whatsapp_sessions
    SET status = 'closed', closed_at = now(), updated_at = now()
    WHERE status <> 'closed'
      AND updated_at < now() - INTERVAL '10 minutes';
  $$
);