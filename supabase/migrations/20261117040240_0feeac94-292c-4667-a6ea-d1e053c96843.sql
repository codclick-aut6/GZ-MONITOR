CREATE TABLE public.goodzap_sistema (
 id boolean PRIMARY KEY DEFAULT true,
 instancia text NOT NULL DEFAULT '',
 debounce_segundos integer NOT NULL DEFAULT 45,
 atendimento_segundos integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.goodzap_sistema TO authenticated;
GRANT ALL ON public.goodzap_sistema TO service_role;
ALTER TABLE public.goodzap_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY goodzap_system_super_admin ON public.goodzap_sistema FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super-admin')) WITH CHECK (public.has_role(auth.uid(),'super-admin'));
CREATE FUNCTION public.validar_goodzap_sistema() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF NEW.id IS NOT TRUE OR length(NEW.instancia)>200 OR NEW.debounce_segundos NOT BETWEEN 0 AND 3600 OR NEW.atendimento_segundos NOT BETWEEN 0 AND 86400 THEN RAISE EXCEPTION 'Configuração de sistema inválida' USING ERRCODE='22023'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.validar_goodzap_sistema() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validar_goodzap_sistema BEFORE INSERT OR UPDATE ON public.goodzap_sistema FOR EACH ROW EXECUTE FUNCTION public.validar_goodzap_sistema();
CREATE TRIGGER goodzap_sistema_updated_at BEFORE UPDATE ON public.goodzap_sistema FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.goodzap_sistema(id,instancia,debounce_segundos,atendimento_segundos) VALUES(true,'',45,0);
INSERT INTO public.configuracoes_goodzap(goodzap_status,distancia_maxima) SELECT 'desativado',6 WHERE NOT EXISTS(SELECT 1 FROM public.configuracoes_goodzap);
INSERT INTO public.horario_empresa_goodzap(dia_semana_id,dia_semana_nome,abre_as,fecha_as,ativo) VALUES
 (0,'Domingo','00:00','00:00',false),(1,'Segunda-feira','00:00','00:00',false),(2,'Terça-feira','00:00','00:00',false),(3,'Quarta-feira','00:00','00:00',false),(4,'Quinta-feira','00:00','00:00',false),(5,'Sexta-feira','00:00','00:00',false),(6,'Sábado','00:00','00:00',false) ON CONFLICT(dia_semana_id) DO NOTHING;
-- Preserve the earliest active imported row if inconsistent legacy data exists.
UPDATE public.telefones_admin_goodzap SET ativa=false WHERE ativa IS TRUE AND id<>(SELECT min(id) FROM public.telefones_admin_goodzap WHERE ativa IS TRUE);
UPDATE public.saudacoes_goodzap SET ativa=false WHERE ativa IS TRUE AND id<>(SELECT min(id) FROM public.saudacoes_goodzap WHERE ativa IS TRUE);
CREATE UNIQUE INDEX goodzap_one_active_contact ON public.telefones_admin_goodzap((ativa)) WHERE ativa IS TRUE;
CREATE UNIQUE INDEX goodzap_one_active_greeting ON public.saudacoes_goodzap((ativa)) WHERE ativa IS TRUE;
CREATE FUNCTION public.salvar_goodzap_exclusivo(p_tabela text,p_id bigint,p_dados jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
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
CREATE FUNCTION public.buscar_configuracoes_goodzap() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object(
 'versao',1,
 'configuracoes_goodzap',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.configuracoes_goodzap t),'[]'::jsonb),
 'empresa_info',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.empresa_info t),'[]'::jsonb),
 'telefones_admin_goodzap',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.telefones_admin_goodzap t),'[]'::jsonb),
 'horario_empresa_goodzap',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY dia_semana_id) FROM public.horario_empresa_goodzap t),'[]'::jsonb),
 'promocoes_goodzap',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.promocoes_goodzap t),'[]'::jsonb),
 'saudacoes_goodzap',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.saudacoes_goodzap t),'[]'::jsonb),
 'numeros_especiais',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.numeros_especiais t),'[]'::jsonb),
 'sistema',(SELECT to_jsonb(t)-'id'-'created_at'-'updated_at' FROM public.goodzap_sistema t WHERE id=true)
 );
$$;
REVOKE ALL ON FUNCTION public.buscar_configuracoes_goodzap() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_configuracoes_goodzap() TO service_role;