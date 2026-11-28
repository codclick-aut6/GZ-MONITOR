ALTER TABLE public.whatsapp_messages ADD COLUMN sender_name text;
ALTER TABLE public.whatsapp_messages DROP CONSTRAINT whatsapp_messages_sender_type_check;
ALTER TABLE public.whatsapp_messages ADD CONSTRAINT whatsapp_messages_sender_type_check CHECK (sender_type IN ('client','contact','ai','human','system','attendant'));

CREATE FUNCTION public.stamp_whatsapp_message_sender() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE v_user uuid := auth.uid(); v_name text;
BEGIN
 IF NEW.sender_type = 'attendant' OR (NEW.sender_type = 'human' AND NEW.sender_user_id IS NOT NULL) THEN
  IF current_user = 'authenticated' OR current_setting('role',true) = 'authenticated' THEN
   IF v_user IS NULL THEN RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE='42501'; END IF;
   IF NEW.sender_user_id IS NOT NULL AND NEW.sender_user_id <> v_user THEN RAISE EXCEPTION 'Remetente inválido' USING ERRCODE='42501'; END IF;
   NEW.sender_user_id := v_user;
   SELECT COALESCE(NULLIF(btrim(name),''),NULLIF(btrim(email),''),'Atendente') INTO v_name FROM public.profiles WHERE id=v_user;
   IF NOT FOUND THEN RAISE EXCEPTION 'Perfil do atendente indisponível' USING ERRCODE='42501'; END IF;
   NEW.sender_name := v_name;
  ELSE
   IF NEW.sender_user_id IS NULL THEN RAISE EXCEPTION 'Informe sender_user_id para mensagens do atendente' USING ERRCODE='22023'; END IF;
   IF NULLIF(btrim(NEW.sender_name),'') IS NULL THEN
    SELECT COALESCE(NULLIF(btrim(name),''),NULLIF(btrim(email),''),'Atendente') INTO v_name FROM public.profiles WHERE id=NEW.sender_user_id;
    NEW.sender_name := COALESCE(v_name,'Atendente');
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.stamp_whatsapp_message_sender() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stamp_whatsapp_message_sender() TO service_role;
CREATE TRIGGER stamp_whatsapp_message_sender BEFORE INSERT ON public.whatsapp_messages FOR EACH ROW EXECUTE FUNCTION public.stamp_whatsapp_message_sender();

CREATE OR REPLACE FUNCTION public.increment_unread_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
 IF NEW.sender_type IN ('contact','client') OR (NEW.sender_type='human' AND NEW.sender_user_id IS NULL) THEN
  UPDATE public.whatsapp_sessions SET unread_count=CASE WHEN status='closed' THEN 0 ELSE unread_count+1 END,updated_at=now() WHERE session_id=NEW.session_id;
 ELSIF NEW.sender_type='attendant' OR (NEW.sender_type='human' AND NEW.sender_user_id IS NOT NULL) THEN
  UPDATE public.whatsapp_sessions SET unread_count=0,updated_at=now() WHERE session_id=NEW.session_id;
 ELSE
  UPDATE public.whatsapp_sessions SET updated_at=now() WHERE session_id=NEW.session_id;
 END IF;
 RETURN NEW;
END;
$function$;