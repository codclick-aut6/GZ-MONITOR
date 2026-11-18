CREATE SCHEMA IF NOT EXISTS invitation_private;
REVOKE ALL ON SCHEMA invitation_private FROM PUBLIC;
GRANT USAGE ON SCHEMA invitation_private TO anon, authenticated, service_role;
ALTER FUNCTION public.validate_registration_token(text) SET SCHEMA invitation_private;
ALTER FUNCTION invitation_private.validate_registration_token(text) SET search_path = '';
ALTER FUNCTION public.assign_role_from_token(text, uuid) SET SCHEMA invitation_private;
ALTER FUNCTION invitation_private.assign_role_from_token(text, uuid) SET search_path = '';
CREATE FUNCTION public.validate_registration_token(_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT invitation_private.validate_registration_token(_token); $$;
REVOKE ALL ON FUNCTION public.validate_registration_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_registration_token(text) TO anon, authenticated, service_role;
CREATE FUNCTION public.assign_role_from_token(_token text, _user_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT invitation_private.assign_role_from_token(_token, _user_id); $$;
REVOKE ALL ON FUNCTION public.assign_role_from_token(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_role_from_token(text, uuid) TO authenticated, service_role;
CREATE INDEX tokens_redeemed_by_idx ON public.tokens(redeemed_by) WHERE redeemed_by IS NOT NULL;