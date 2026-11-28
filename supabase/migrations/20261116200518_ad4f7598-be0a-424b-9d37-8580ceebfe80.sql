ALTER TABLE public.tokens ADD COLUMN redeemed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, ADD COLUMN redeemed_at timestamptz;
REVOKE ALL ON public.tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tokens TO service_role;

CREATE FUNCTION public.validate_registration_token(_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN _token IS NULL OR length(btrim(_token)) NOT BETWEEN 1 AND 200 THEN false
    ELSE EXISTS (SELECT 1 FROM public.tokens WHERE token = btrim(_token) AND used = false AND redeemed_by IS NULL)
  END;
$$;
REVOKE ALL ON FUNCTION public.validate_registration_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_registration_token(text) TO anon, authenticated, service_role;

-- Only trusted signup code may finalize a reservation made with the service client.
-- The caller cannot choose a role: it is always read from the private invitation.
CREATE FUNCTION public.complete_registration_token(_token_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_token public.tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_token FROM public.tokens WHERE id = _token_id FOR UPDATE;
  IF NOT FOUND OR v_token.used IS NOT TRUE OR v_token.redeemed_by IS NOT NULL THEN
    RAISE EXCEPTION 'Token inválido ou já utilizado.' USING ERRCODE = '22023';
  END IF;
  IF _user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'Conta não encontrada.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.tokens SET redeemed_by = _user_id, redeemed_at = now() WHERE id = v_token.id;
  IF v_token.token_role <> 'attendant'::public.app_role THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'attendant'::public.app_role;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, v_token.token_role)
    ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_registration_token(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_registration_token(uuid, uuid) TO service_role;

-- Legacy signature is retained, but public/other-account role assignment is forbidden.
CREATE FUNCTION public.assign_role_from_token(_token text, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_token_id uuid;
BEGIN
  IF auth.uid() IS NULL OR _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Você só pode usar um convite na sua própria conta autenticada.' USING ERRCODE = '42501';
  END IF;
  IF _token IS NULL OR length(btrim(_token)) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Token inválido ou já utilizado.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.tokens SET used = true
    WHERE token = btrim(_token) AND used = false AND redeemed_by IS NULL
    RETURNING id INTO v_token_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido ou já utilizado.' USING ERRCODE = '22023';
  END IF;
  PERFORM public.complete_registration_token(v_token_id, _user_id);
END;
$$;
REVOKE ALL ON FUNCTION public.assign_role_from_token(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_role_from_token(text, uuid) TO authenticated, service_role;