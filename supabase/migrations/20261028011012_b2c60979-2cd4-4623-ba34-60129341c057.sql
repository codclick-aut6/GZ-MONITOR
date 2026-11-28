CREATE TABLE public.whatsapp_session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES public.whatsapp_sessions(session_id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type = 'assignment'),
  attendant_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  attendant_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.whatsapp_session_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.whatsapp_session_events TO authenticated;
GRANT ALL ON public.whatsapp_session_events TO service_role;
ALTER TABLE public.whatsapp_session_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can read internal conversation events"
ON public.whatsapp_session_events FOR SELECT TO authenticated USING (true);
CREATE INDEX whatsapp_session_events_history_idx ON public.whatsapp_session_events (session_id, created_at, id);

CREATE OR REPLACE FUNCTION public.record_whatsapp_session_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name text;
BEGIN
  IF NEW.assigned_to IS NULL OR NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(NULLIF(btrim(name), ''), NULLIF(btrim(email), ''), 'Atendente')
  INTO display_name FROM public.profiles WHERE id = NEW.assigned_to;
  INSERT INTO public.whatsapp_session_events (session_id, event_type, attendant_id, attendant_name)
  VALUES (NEW.session_id, 'assignment', NEW.assigned_to, COALESCE(display_name, 'Atendente'));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_whatsapp_session_assignment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER record_whatsapp_session_assignment
AFTER UPDATE OF assigned_to ON public.whatsapp_sessions
FOR EACH ROW
WHEN (NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)
EXECUTE FUNCTION public.record_whatsapp_session_assignment();
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_session_events;

DO $$
DECLARE
  user_one uuid := gen_random_uuid();
  user_two uuid := gen_random_uuid();
  test_session text := 'assignment-regression-' || gen_random_uuid()::text;
BEGIN
  BEGIN
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (user_one, user_one::text || '@assignment-test.invalid', '{"name":"Assignment test one"}'::jsonb),
           (user_two, user_two::text || '@assignment-test.invalid', '{"name":"Assignment test two"}'::jsonb);
    INSERT INTO public.whatsapp_sessions (session_id, contact_phone, status, unread_count)
    VALUES (test_session, '0000000000', 'paused', 5);
    UPDATE public.whatsapp_sessions SET assigned_to = user_one WHERE session_id = test_session;
    IF (SELECT count(*) FROM public.whatsapp_session_events WHERE session_id = test_session) <> 1 THEN
      RAISE EXCEPTION 'A successful assignment must record exactly one internal event';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.whatsapp_session_events WHERE session_id = test_session AND event_type = 'assignment' AND attendant_id = user_one AND attendant_name = 'Assignment test one') THEN
      RAISE EXCEPTION 'Assignment events must preserve the attendant identity and name';
    END IF;
    UPDATE public.profiles SET name = 'Renamed test user' WHERE id = user_one;
    IF NOT EXISTS (SELECT 1 FROM public.whatsapp_session_events WHERE session_id = test_session AND attendant_name = 'Assignment test one') THEN
      RAISE EXCEPTION 'Historic attendant names must not change when a profile is renamed';
    END IF;
    UPDATE public.whatsapp_sessions SET assigned_to = user_one WHERE session_id = test_session;
    UPDATE public.whatsapp_sessions SET unread_count = 5 WHERE session_id = test_session;
    IF (SELECT count(*) FROM public.whatsapp_session_events WHERE session_id = test_session) <> 1 THEN
      RAISE EXCEPTION 'Repeated assignment and unrelated updates must not duplicate events';
    END IF;
    UPDATE public.whatsapp_sessions SET assigned_to = NULL WHERE session_id = test_session;
    IF (SELECT count(*) FROM public.whatsapp_session_events WHERE session_id = test_session) <> 1 THEN
      RAISE EXCEPTION 'Releasing a conversation must not create an assignment notice';
    END IF;
    UPDATE public.whatsapp_sessions SET assigned_to = user_one WHERE session_id = test_session;
    UPDATE public.whatsapp_sessions SET assigned_to = user_two WHERE session_id = test_session;
    IF (SELECT count(*) FROM public.whatsapp_session_events WHERE session_id = test_session) <> 3 THEN
      RAISE EXCEPTION 'Reassignment and transfer must each record one event';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.whatsapp_session_events WHERE session_id = test_session AND attendant_id = user_two AND attendant_name = 'Assignment test two') THEN
      RAISE EXCEPTION 'Transfers must record the new attendant';
    END IF;
    IF (SELECT unread_count FROM public.whatsapp_sessions WHERE session_id = test_session) <> 5 THEN
      RAISE EXCEPTION 'Internal notices must neither increase nor reset unread counts';
    END IF;
    IF EXISTS (SELECT 1 FROM public.whatsapp_messages WHERE session_id = test_session) THEN
      RAISE EXCEPTION 'Internal notices must not create outbound WhatsApp messages';
    END IF;
    IF has_table_privilege('anon', 'public.whatsapp_session_events', 'SELECT') THEN
      RAISE EXCEPTION 'Internal notices must not be publicly readable';
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'Rollback assignment regression test data';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN
    NULL;
  END;
END;
$$;