CREATE OR REPLACE FUNCTION public.clear_closed_session_unread()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'closed' THEN
    NEW.unread_count := 0;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.clear_closed_session_unread() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER clear_closed_session_unread
BEFORE INSERT OR UPDATE ON public.whatsapp_sessions
FOR EACH ROW EXECUTE FUNCTION public.clear_closed_session_unread();

UPDATE public.whatsapp_sessions
SET unread_count = 0
WHERE status = 'closed' AND unread_count <> 0;

DO $$
DECLARE
  sample public.whatsapp_sessions%ROWTYPE;
BEGIN
  SELECT * INTO sample FROM public.whatsapp_sessions LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unread regression test requires an existing session';
  END IF;
  BEGIN
    UPDATE public.whatsapp_sessions SET status = 'closed', unread_count = 9 WHERE id = sample.id;
    IF (SELECT unread_count FROM public.whatsapp_sessions WHERE id = sample.id) <> 0 THEN
      RAISE EXCEPTION 'Closing a session must persist unread_count = 0';
    END IF;
    INSERT INTO public.whatsapp_messages (session_id, contact_phone, sender_type, content)
    VALUES (sample.session_id, sample.contact_phone, 'human', 'Unread regression test');
    IF (SELECT unread_count FROM public.whatsapp_sessions WHERE id = sample.id) <> 0 THEN
      RAISE EXCEPTION 'Closed sessions must not regain unread counts';
    END IF;
    UPDATE public.whatsapp_sessions SET status = 'active', unread_count = 0 WHERE id = sample.id;
    INSERT INTO public.whatsapp_messages (session_id, contact_phone, sender_type, content)
    VALUES (sample.session_id, sample.contact_phone, 'human', 'Unread regression test');
    IF (SELECT unread_count FROM public.whatsapp_sessions WHERE id = sample.id) <> 1 THEN
      RAISE EXCEPTION 'Open sessions must still count incoming messages';
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'Rollback regression test data';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN
    NULL;
  END;
END;
$$;