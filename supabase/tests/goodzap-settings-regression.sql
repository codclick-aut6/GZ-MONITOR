-- Rollback-only checks; negative identifiers leave identity sequences untouched.
DO $regression$
DECLARE
 original_role text := current_user;
 admin_id uuid; super_id uuid; payload jsonb; n bigint; settings_id bigint;
BEGIN
 IF has_function_privilege('anon','public.buscar_configuracoes_goodzap()','EXECUTE') OR has_function_privilege('authenticated','public.buscar_configuracoes_goodzap()','EXECUTE') THEN RAISE EXCEPTION 'Aggregate RPC exposed'; END IF;
 IF NOT has_function_privilege('service_role','public.buscar_configuracoes_goodzap()','EXECUTE') THEN RAISE EXCEPTION 'Service RPC grant missing'; END IF;
 IF has_column_privilege('authenticated','public.goodzap_sistema','comunicacao_apikey','SELECT') THEN RAISE EXCEPTION 'Browser can read saved communication key'; END IF;
 IF NOT has_column_privilege('service_role','public.goodzap_sistema','comunicacao_apikey','SELECT') THEN RAISE EXCEPTION 'Service communication access missing'; END IF;
 SELECT user_id INTO admin_id FROM public.user_roles WHERE role='admin' LIMIT 1;
 SELECT user_id INTO super_id FROM public.user_roles WHERE role='super-admin' LIMIT 1;
 IF admin_id IS NULL THEN admin_id:=super_id; END IF;
 IF admin_id IS NULL OR super_id IS NULL THEN RAISE EXCEPTION 'Existing administrator required for regression checks'; END IF;
 BEGIN
  -- All temporary mutations, including deactivation of existing rows, roll back.
  INSERT INTO public.telefones_admin_goodzap(id,numero_atendente,numero_gerente,ativa) VALUES(-900000000000081,'11999990001','11999990002',false),(-900000000000082,'11999990003','11999990004',false);
  INSERT INTO public.saudacoes_goodzap(id,saudacao,ativa) VALUES(-900000000000081,'Regression greeting one',false),(-900000000000082,'Regression greeting two',false);
  SELECT id INTO settings_id FROM public.configuracoes_goodzap ORDER BY id LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
  PERFORM set_config('role','authenticated',true);
  PERFORM public.salvar_goodzap_exclusivo('telefones_admin_goodzap',-900000000000081,'{"numero_atendente":"11999990001","numero_gerente":"11999990002","ativa":true}');
  PERFORM public.salvar_goodzap_exclusivo('telefones_admin_goodzap',-900000000000082,'{"numero_atendente":"11999990003","numero_gerente":"11999990004","ativa":true}');
  SELECT count(*) INTO n FROM public.telefones_admin_goodzap WHERE ativa=true;
  IF n<>1 OR NOT EXISTS(SELECT 1 FROM public.telefones_admin_goodzap WHERE id=-900000000000082 AND ativa=true) THEN RAISE EXCEPTION 'Contact exclusivity failed'; END IF;
  PERFORM public.salvar_goodzap_exclusivo('saudacoes_goodzap',-900000000000081,'{"saudacao":"Regression greeting one","ativa":true}');
  PERFORM public.salvar_goodzap_exclusivo('saudacoes_goodzap',-900000000000082,'{"saudacao":"Regression greeting two","ativa":true}');
  SELECT count(*) INTO n FROM public.saudacoes_goodzap WHERE ativa=true;
  IF n<>1 OR NOT EXISTS(SELECT 1 FROM public.saudacoes_goodzap WHERE id=-900000000000082 AND ativa=true) THEN RAISE EXCEPTION 'Greeting exclusivity failed'; END IF;
  UPDATE public.configuracoes_goodzap SET distancia_maxima=6 WHERE id=settings_id;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Admin cannot save delivery settings'; END IF;
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
  UPDATE public.configuracoes_goodzap SET distancia_maxima=999 WHERE id=settings_id;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'Non-admin changed settings'; END IF;
  BEGIN
   PERFORM public.salvar_goodzap_exclusivo('saudacoes_goodzap',-900000000000082,'{"saudacao":"Forbidden","ativa":true}');
   RAISE EXCEPTION 'Non-admin could call exclusive write';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  SELECT count(*) INTO n FROM public.goodzap_sistema;
  IF n<>0 THEN RAISE EXCEPTION 'Non-super-admin read system settings'; END IF;
  PERFORM set_config('request.jwt.claim.sub',super_id::text,true);
  UPDATE public.goodzap_sistema SET instancia='regression-instance',debounce_segundos=45,atendimento_segundos=0 WHERE id=true;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Super-admin system write failed'; END IF;
  PERFORM set_config('role','service_role',true);
  SELECT public.buscar_configuracoes_goodzap() INTO payload;
  IF payload->'sistema'->>'instancia'<>'regression-instance' OR (payload->'sistema'->>'debounce_segundos')::integer<>45 OR (payload->'sistema'->>'atendimento_segundos')::integer<>0 THEN RAISE EXCEPTION 'Aggregate lost persisted system values'; END IF;
  IF jsonb_array_length(payload->'horario_empresa_goodzap')<>7 OR (payload->'horario_empresa_goodzap'->0->>'dia_semana_id')::integer<>0 THEN RAISE EXCEPTION 'Weekday payload incomplete or unordered'; END IF;
  IF NOT (payload ?& ARRAY['configuracoes_goodzap','empresa_info','telefones_admin_goodzap','horario_empresa_goodzap','promocoes_goodzap','saudacoes_goodzap','numeros_especiais','sistema']) OR payload ? 'whatsapp_messages' THEN RAISE EXCEPTION 'Aggregate contract mismatch'; END IF;
  INSERT INTO public.numeros_especiais(id,nome,telefone) SELECT -900000000010000-g,'Regression aggregate '||g,'11999990000' FROM generate_series(1,1001) g;
  SELECT public.buscar_configuracoes_goodzap() INTO payload;
  SELECT count(*) INTO n FROM jsonb_array_elements(payload->'numeros_especiais') x WHERE x->>'nome' LIKE 'Regression aggregate %';
  IF n<>1001 THEN RAISE EXCEPTION 'Aggregate truncated settings at 1000 rows'; END IF;
  PERFORM set_config('role',original_role,true);
  RAISE EXCEPTION 'Successful regression rollback' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
END $regression$;