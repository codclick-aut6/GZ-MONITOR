CREATE OR REPLACE FUNCTION public.increment_unread_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Mensagens do cliente: sender_type 'contact' OU 'human' sem atendente identificado
  -- (o webhook do WhatsApp grava mensagens recebidas como 'human' com sender_user_id nulo)
  IF NEW.sender_type = 'contact' OR (NEW.sender_type = 'human' AND NEW.sender_user_id IS NULL) THEN
    UPDATE public.whatsapp_sessions SET unread_count = unread_count + 1, updated_at = now()
    WHERE session_id = NEW.session_id;
  ELSIF NEW.sender_type = 'human' AND NEW.sender_user_id IS NOT NULL THEN
    UPDATE public.whatsapp_sessions SET unread_count = 0 WHERE session_id = NEW.session_id;
  END IF;
  RETURN NEW;
END; $function$