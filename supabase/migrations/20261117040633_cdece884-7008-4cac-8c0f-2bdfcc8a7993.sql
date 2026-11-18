CREATE OR REPLACE FUNCTION public.salvar_goodzap_exclusivo(p_tabela text,p_id bigint DEFAULT NULL,p_dados jsonb DEFAULT '{}'::jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id bigint; v_ativa boolean;
BEGIN
 IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super-admin')) THEN RAISE EXCEPTION 'Acesso restrito a administradores' USING ERRCODE='42501'; END IF;
 IF p_tabela NOT IN ('telefones_admin_goodzap','saudacoes_goodzap') OR jsonb_typeof(p_dados)<>'object' THEN RAISE EXCEPTION 'Dados inválidos' USING ERRCODE='22023'; END IF;
 v_ativa := COALESCE((p_dados->>'ativa')::boolean,false);
 PERFORM pg_advisory_xact_lock(hashtext('goodzap-exclusive-'||p_tabela));
 IF p_tabela='telefones_admin_goodzap' THEN
  IF COALESCE(p_dados->>'numero_atendente','') !~ '^\+?[0-9 ()-]{8,25}$' OR COALESCE(p_dados->>'numero_gerente','') !~ '^\+?[0-9 ()-]{8,25}$' THEN RAISE EXCEPTION 'Telefones inválidos' USING ERRCODE='22023'; END IF;
  IF p_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.telefones_admin_goodzap WHERE id=p_id) THEN RAISE EXCEPTION 'Registro não encontrado'; END IF;
  IF v_ativa THEN UPDATE public.telefones_admin_goodzap SET ativa=false WHERE ativa IS TRUE AND (p_id IS NULL OR id<>p_id); END IF;
  IF p_id IS NULL THEN INSERT INTO public.telefones_admin_goodzap(numero_atendente,numero_gerente,ativa) VALUES(p_dados->>'numero_atendente',p_dados->>'numero_gerente',v_ativa) RETURNING id INTO v_id;
  ELSE UPDATE public.telefones_admin_goodzap SET numero_atendente=p_dados->>'numero_atendente',numero_gerente=p_dados->>'numero_gerente',ativa=v_ativa WHERE id=p_id RETURNING id INTO v_id; END IF;
 ELSE
  IF length(btrim(COALESCE(p_dados->>'saudacao',''))) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Saudação inválida' USING ERRCODE='22023'; END IF;
  IF p_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.saudacoes_goodzap WHERE id=p_id) THEN RAISE EXCEPTION 'Registro não encontrado'; END IF;
  IF v_ativa THEN UPDATE public.saudacoes_goodzap SET ativa=false WHERE ativa IS TRUE AND (p_id IS NULL OR id<>p_id); END IF;
  IF p_id IS NULL THEN INSERT INTO public.saudacoes_goodzap(saudacao,ativa) VALUES(p_dados->>'saudacao',v_ativa) RETURNING id INTO v_id;
  ELSE UPDATE public.saudacoes_goodzap SET saudacao=p_dados->>'saudacao',ativa=v_ativa WHERE id=p_id RETURNING id INTO v_id; END IF;
 END IF; RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.salvar_goodzap_exclusivo(text,bigint,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.salvar_goodzap_exclusivo(text,bigint,jsonb) TO authenticated;