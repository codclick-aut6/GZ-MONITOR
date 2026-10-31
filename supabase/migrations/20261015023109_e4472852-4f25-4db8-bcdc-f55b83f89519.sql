ALTER TABLE public.whatsapp_sessions ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_unread_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.sender_type = 'contact' THEN
    UPDATE public.whatsapp_sessions SET unread_count = unread_count + 1, updated_at = now()
    WHERE session_id = NEW.session_id;
  ELSIF NEW.sender_type = 'human' THEN
    UPDATE public.whatsapp_sessions SET unread_count = 0 WHERE session_id = NEW.session_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_whatsapp_message_unread ON public.whatsapp_messages;
CREATE TRIGGER on_whatsapp_message_unread AFTER INSERT ON public.whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION public.increment_unread_count();