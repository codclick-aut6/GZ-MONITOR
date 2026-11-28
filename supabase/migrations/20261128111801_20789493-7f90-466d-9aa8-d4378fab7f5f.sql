CREATE OR REPLACE FUNCTION public.increment_unread_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
BEGIN
 IF NEW.sender_type IN ('contact','client') THEN
  UPDATE public.whatsapp_sessions SET unread_count=CASE WHEN status='closed' THEN 0 ELSE unread_count+1 END,updated_at=now() WHERE session_id=NEW.session_id;
 ELSIF NEW.sender_type IN ('attendant','human') THEN
  UPDATE public.whatsapp_sessions SET unread_count=0,updated_at=now() WHERE session_id=NEW.session_id;
 ELSE
  UPDATE public.whatsapp_sessions SET updated_at=now() WHERE session_id=NEW.session_id;
 END IF;
 RETURN NEW;
END;
$function$;