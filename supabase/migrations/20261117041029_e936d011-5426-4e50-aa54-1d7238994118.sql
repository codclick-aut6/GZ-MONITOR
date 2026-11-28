ALTER TABLE public.goodzap_sistema ADD COLUMN comunicacao_apikey text NOT NULL DEFAULT '';
REVOKE SELECT ON public.goodzap_sistema FROM authenticated;
GRANT SELECT(id,instancia,debounce_segundos,atendimento_segundos,created_at,updated_at) ON public.goodzap_sistema TO authenticated;
-- Existing super-admin RLS governs all writes. service_role retains its full table grant.
CREATE OR REPLACE FUNCTION public.validar_goodzap_sistema() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF NEW.id IS NOT TRUE OR length(NEW.instancia)>200 OR NEW.debounce_segundos NOT BETWEEN 0 AND 3600 OR NEW.atendimento_segundos NOT BETWEEN 0 AND 86400 OR length(NEW.comunicacao_apikey)>4096 THEN RAISE EXCEPTION 'Configuração de sistema inválida' USING ERRCODE='22023'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.validar_goodzap_sistema() FROM PUBLIC,anon,authenticated;
-- buscar_configuracoes_goodzap is service-only and its system projection includes the new communication field.
