-- Execute via the database tool. All fixture writes roll back automatically.
-- Existing account IDs are used only inside rolled-back subtransactions.
DO $regression$
DECLARE
  v_user uuid;
  v_other uuid := gen_random_uuid();
  v_id uuid;
  v_prefix text := '__invitation_regression__' || gen_random_uuid()::text;
  v_token text;
  v_role public.app_role;
  v_original_role text := current_user;
BEGIN
  SELECT id INTO v_user FROM public.profiles ORDER BY created_at LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'An existing profile is required for rollback-only role tests'; END IF;

  IF has_table_privilege('anon','public.tokens','SELECT') OR has_table_privilege('authenticated','public.tokens','SELECT') THEN
    RAISE EXCEPTION 'Invitation rows are exposed';
  END IF;
  IF has_function_privilege('anon','public.assign_role_from_token(text,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous role assignment is exposed';
  END IF;
  IF has_function_privilege('authenticated','public.complete_registration_token(uuid,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Trusted registration completion is exposed';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE oid IN ('public.validate_registration_token(text)'::regprocedure,'public.assign_role_from_token(text,uuid)'::regprocedure) AND prosecdef) THEN
    RAISE EXCEPTION 'Public wrappers must use invoker privileges';
  END IF;

  -- Concrete token roles are honored; each token can be redeemed once only.
  FOREACH v_role IN ARRAY ARRAY['attendant','user','admin','super-admin']::public.app_role[] LOOP
    BEGIN
      v_token := v_prefix || '-' || v_role::text;
      INSERT INTO public.tokens(token, token_role) VALUES(v_token,v_role) RETURNING id INTO v_id;
      INSERT INTO public.user_roles(user_id,role) VALUES(v_user,'attendant') ON CONFLICT DO NOTHING;
      PERFORM set_config('request.jwt.claim.sub',v_user::text,true);
      PERFORM set_config('role','anon',true);
      IF public.validate_registration_token(' ' || v_token || ' ') IS NOT TRUE THEN RAISE EXCEPTION 'Exact token validation failed'; END IF;
      IF public.validate_registration_token(v_prefix) OR public.validate_registration_token('%') OR public.validate_registration_token(NULL) THEN RAISE EXCEPTION 'Non-exact token accepted'; END IF;
      BEGIN
        PERFORM public.assign_role_from_token(v_token,v_user);
        RAISE EXCEPTION 'Anonymous caller assigned a role';
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
      PERFORM set_config('role','authenticated',true);
      BEGIN
        PERFORM public.assign_role_from_token(v_token,v_other);
        RAISE EXCEPTION 'Caller assigned a role to another account';
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
      IF public.validate_registration_token(v_token) IS NOT TRUE THEN RAISE EXCEPTION 'Rejected assignment consumed token'; END IF;
      PERFORM public.assign_role_from_token(v_token,v_user);
      IF public.validate_registration_token(v_token) THEN RAISE EXCEPTION 'Used token still available'; END IF;
      IF NOT public.has_role(v_user,v_role) THEN RAISE EXCEPTION 'Invitation role % not assigned',v_role; END IF;
      IF v_role <> 'attendant' AND public.has_role(v_user,'attendant') THEN RAISE EXCEPTION 'Default role not replaced'; END IF;
      BEGIN
        PERFORM public.assign_role_from_token(v_token,v_user);
        RAISE EXCEPTION 'Token was redeemed twice';
      EXCEPTION WHEN invalid_parameter_value THEN NULL;
      END;
      PERFORM set_config('role',v_original_role,true);
      IF NOT EXISTS(SELECT 1 FROM public.tokens WHERE id=v_id AND used=true AND redeemed_by=v_user AND redeemed_at IS NOT NULL) THEN RAISE EXCEPTION 'Token redemption audit missing'; END IF;
      RAISE EXCEPTION 'rollback successful role test' USING ERRCODE='ZX001';
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
    END;
  END LOOP;

  -- A missing account makes the complete transaction fail, restoring availability.
  BEGIN
    v_token := v_prefix || '-atomic';
    INSERT INTO public.tokens(token,token_role) VALUES(v_token,'attendant');
    PERFORM set_config('request.jwt.claim.sub',v_other::text,true);
    PERFORM set_config('role','authenticated',true);
    BEGIN
      PERFORM public.assign_role_from_token(v_token,v_other);
      RAISE EXCEPTION 'Missing account was accepted';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    IF public.validate_registration_token(v_token) IS NOT TRUE THEN RAISE EXCEPTION 'Failed completion consumed token'; END IF;
    PERFORM set_config('request.jwt.claim.sub','',true);
    BEGIN
      PERFORM public.assign_role_from_token(v_token,v_user);
      RAISE EXCEPTION 'Missing caller identity was accepted';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    PERFORM set_config('role',v_original_role,true);
    RAISE EXCEPTION 'rollback successful atomicity test' USING ERRCODE='ZX001';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;

  -- Service signup completion requires an actual, unredeemed reservation.
  BEGIN
    v_token := v_prefix || '-service';
    INSERT INTO public.tokens(token,token_role) VALUES(v_token,'admin') RETURNING id INTO v_id;
    PERFORM set_config('role','service_role',true);
    BEGIN
      PERFORM public.complete_registration_token(v_id,v_user);
      RAISE EXCEPTION 'Unreserved invitation finalized';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    UPDATE public.tokens SET used=true WHERE id=v_id;
    PERFORM public.complete_registration_token(v_id,v_user);
    IF NOT public.has_role(v_user,'admin') THEN RAISE EXCEPTION 'Service completion did not assign invitation role'; END IF;
    BEGIN
      PERFORM public.complete_registration_token(v_id,v_user);
      RAISE EXCEPTION 'Redeemed reservation finalized twice';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    PERFORM set_config('role',v_original_role,true);
    RAISE EXCEPTION 'rollback successful service completion test' USING ERRCODE='ZX001';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
  IF EXISTS(SELECT 1 FROM public.tokens WHERE token LIKE v_prefix || '%') THEN RAISE EXCEPTION 'Regression fixtures were not rolled back'; END IF;
END;
$regression$;