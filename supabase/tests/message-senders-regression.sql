-- All fixtures and writes are rolled back inside the subtransaction.
DO $regression$
DECLARE
 v_user uuid; v_name text; v_session text := '__sender_regression__'||gen_random_uuid()::text;
 v_message uuid; v_sender uuid; v_snapshot text; v_count integer;
BEGIN
 SELECT id,COALESCE(NULLIF(btrim(name),''),NULLIF(btrim(email),''),'Atendente') INTO v_user,v_name FROM public.profiles ORDER BY created_at LIMIT 1;
 IF v_user IS NULL THEN RAISE EXCEPTION 'A profile is required for the sender regression'; END IF;
 BEGIN
  INSERT INTO public.whatsapp_sessions(session_id,contact_phone,status,unread_count) VALUES(v_session,'__sender_regression__','active',5);
  PERFORM set_config('request.jwt.claim.sub',v_user::text,true);
  PERFORM set_config('role','authenticated',true);
  INSERT INTO public.whatsapp_messages(session_id,contact_phone,sender_type,content,sender_name)
   VALUES(v_session,'__sender_regression__','attendant','Test sender identity','Forged name')
   RETURNING id,sender_user_id,sender_name INTO v_message,v_sender,v_snapshot;
  IF v_sender IS DISTINCT FROM v_user OR v_snapshot IS DISTINCT FROM v_name THEN RAISE EXCEPTION 'Authenticated sender identity was not derived from profile'; END IF;
  BEGIN
   INSERT INTO public.whatsapp_messages(session_id,contact_phone,sender_type,content,sender_user_id)
   VALUES(v_session,'__sender_regression__','attendant','Spoof',gen_random_uuid());
   RAISE EXCEPTION 'Spoofed sender was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  SELECT unread_count INTO v_count FROM public.whatsapp_sessions WHERE session_id=v_session;
  IF v_count<>0 THEN RAISE EXCEPTION 'Attendant message must reset unread'; END IF;
  INSERT INTO public.whatsapp_messages(session_id,contact_phone,sender_type,content) VALUES(v_session,'__sender_regression__','client','Client');
   INSERT INTO public.whatsapp_messages(session_id,contact_phone,sender_type,content) VALUES(v_session,'__sender_regression__','contact','Contact');
  SELECT unread_count INTO v_count FROM public.whatsapp_sessions WHERE session_id=v_session;
  IF v_count<>2 THEN RAISE EXCEPTION 'Client messages must increment unread'; END IF;
  INSERT INTO public.whatsapp_messages(session_id,contact_phone,sender_type,content) VALUES(v_session,'__sender_regression__','system','System');
  INSERT INTO public.whatsapp_messages(session_id,contact_phone,sender_type,content) VALUES(v_session,'__sender_regression__','ai','AI');
  SELECT unread_count INTO v_count FROM public.whatsapp_sessions WHERE session_id=v_session;
  IF v_count<>2 THEN RAISE EXCEPTION 'System and AI must not increment unread'; END IF;
   PERFORM set_config('role','service_role',true);
   INSERT INTO public.whatsapp_messages(session_id,contact_phone,sender_type,content) VALUES(v_session,'__sender_regression__','human','Phone reply');
   SELECT sender_user_id INTO v_sender FROM public.whatsapp_messages WHERE session_id=v_session AND content='Phone reply';
   IF v_sender IS NOT NULL THEN RAISE EXCEPTION 'Phone reply must not invent an authenticated sender'; END IF;
   SELECT unread_count INTO v_count FROM public.whatsapp_sessions WHERE session_id=v_session;
   IF v_count<>0 THEN RAISE EXCEPTION 'Phone reply must reset unread'; END IF;
   INSERT INTO public.whatsapp_messages(session_id,contact_phone,sender_type,content) VALUES(v_session,'__sender_regression__','client','New client reply');
   SELECT unread_count INTO v_count FROM public.whatsapp_sessions WHERE session_id=v_session;
   IF v_count<>1 THEN RAISE EXCEPTION 'Client reply after phone reply must increment unread'; END IF;
  UPDATE public.whatsapp_sessions SET status='closed' WHERE session_id=v_session;
  INSERT INTO public.whatsapp_messages(session_id,contact_phone,sender_type,content) VALUES(v_session,'__sender_regression__','client','Closed session client');
  SELECT unread_count INTO v_count FROM public.whatsapp_sessions WHERE session_id=v_session;
  IF v_count<>0 THEN RAISE EXCEPTION 'Closed sessions must remain read'; END IF;
   INSERT INTO public.whatsapp_messages(session_id,contact_phone,sender_type,content) VALUES(v_session,'__sender_regression__','human','Closed session phone reply');
   SELECT unread_count INTO v_count FROM public.whatsapp_sessions WHERE session_id=v_session;
   IF v_count<>0 THEN RAISE EXCEPTION 'Phone replies must not reopen closed-session unread'; END IF;
  RAISE EXCEPTION 'rollback successful sender regression' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM public.whatsapp_sessions WHERE session_id=v_session) THEN RAISE EXCEPTION 'Temporary test session remains'; END IF;
END;
$regression$;