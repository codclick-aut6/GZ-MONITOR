CREATE FUNCTION public.calcular_next_run_at(
 p_ativo boolean, p_tipo text, p_data_inicio date, p_data_final date,
 p_dias_semana integer[], p_horarios text[], p_timezone text
) RETURNS timestamptz LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE
 v_now timestamptz := now(); v_local_now timestamp; v_candidate_date date;
 v_horario text; v_candidate_local timestamp; v_candidate_utc timestamptz;
 v_best timestamptz; v_i integer; v_dow integer;
BEGIN
 IF p_ativo IS NOT TRUE OR p_horarios IS NULL OR array_length(p_horarios,1) IS NULL THEN RETURN NULL; END IF;
 v_local_now := v_now AT TIME ZONE COALESCE(p_timezone,'America/Sao_Paulo');
 FOR v_i IN 0..14 LOOP
  v_candidate_date := (v_local_now + (v_i || ' days')::interval)::date;
  IF p_tipo='periodo' THEN
   IF p_data_inicio IS NOT NULL AND v_candidate_date<p_data_inicio THEN CONTINUE; END IF;
   IF p_data_final IS NOT NULL AND v_candidate_date>p_data_final THEN EXIT; END IF;
  ELSIF p_tipo='dias_semana' THEN
   IF p_dias_semana IS NULL OR array_length(p_dias_semana,1) IS NULL THEN RETURN NULL; END IF;
   v_dow := EXTRACT(DOW FROM v_candidate_date)::integer;
   IF NOT (v_dow=ANY(p_dias_semana)) THEN CONTINUE; END IF;
  ELSE RETURN NULL;
  END IF;
  FOREACH v_horario IN ARRAY p_horarios LOOP
   BEGIN
    v_candidate_local := (v_candidate_date::text || ' ' || v_horario || ':00')::timestamp;
   EXCEPTION WHEN OTHERS THEN CONTINUE;
   END;
   v_candidate_utc := v_candidate_local AT TIME ZONE COALESCE(p_timezone,'America/Sao_Paulo');
   IF v_candidate_utc>v_now AND (v_best IS NULL OR v_candidate_utc<v_best) THEN v_best:=v_candidate_utc; END IF;
  END LOOP;
  IF v_best IS NOT NULL THEN RETURN v_best; END IF;
 END LOOP;
 RETURN v_best;
END;
$$;
REVOKE ALL ON FUNCTION public.calcular_next_run_at(boolean,text,date,date,integer[],text[],text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.calcular_next_run_at(boolean,text,date,date,integer[],text[],text) TO authenticated,service_role;

CREATE FUNCTION public.tg_atualizar_next_run_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 NEW.next_run_at:=public.calcular_next_run_at(NEW.agendamento_ativo,NEW.agendamento_tipo,NEW.agendamento_data_inicio,NEW.agendamento_data_final,NEW.agendamento_dias_semana,NEW.agendamento_horarios,NEW.agendamento_timezone);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.tg_atualizar_next_run_at() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tg_atualizar_next_run_at() TO authenticated,service_role;
CREATE TRIGGER trg_next_run_promocao_aniversario BEFORE INSERT OR UPDATE ON public.promocao_aniversario FOR EACH ROW EXECUTE FUNCTION public.tg_atualizar_next_run_at();
CREATE TRIGGER trg_next_run_recuperacao_clientes BEFORE INSERT OR UPDATE ON public.recuperacao_clientes FOR EACH ROW EXECUTE FUNCTION public.tg_atualizar_next_run_at();
CREATE TRIGGER trg_next_run_promocoes_goodzap BEFORE INSERT OR UPDATE ON public.promocoes_goodzap FOR EACH ROW EXECUTE FUNCTION public.tg_atualizar_next_run_at();

CREATE FUNCTION public.buscar_disparos_prontos(p_limite integer DEFAULT 100)
RETURNS TABLE(origem text,id bigint,next_run_at timestamptz,dados jsonb)
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 RETURN QUERY
 (
  SELECT 'promocoes_goodzap'::text,t.id,t.next_run_at,
   jsonb_build_object('id',t.id,'created_at',t.created_at,'tipo','promocao','promocao',t.promocao,
    'regras',t.regras,'ativa',t.ativa,'imagem_promocao',t.imagem_promocao,
    'imagem_promocao_ativa',CASE WHEN t.imagem_ativa THEN 'ativa' ELSE 'desativada' END,
    'imagem_promocao_ativa_url',t.imagem_url,'legenda',t.legenda,'agendamento_ativo',t.agendamento_ativo,
    'agendamento_tipo',t.agendamento_tipo,'agendamento_data_inicio',t.agendamento_data_inicio,
    'agendamento_data_final',t.agendamento_data_final,'agendamento_dias_semana',t.agendamento_dias_semana,
    'agendamento_horarios',t.agendamento_horarios,'agendamento_timezone',t.agendamento_timezone)
  FROM public.promocoes_goodzap t WHERE t.agendamento_ativo=true AND t.next_run_at IS NOT NULL AND t.next_run_at<=now()
 ) UNION ALL (
  SELECT 'recuperacao_clientes'::text,t.id,t.next_run_at,
   jsonb_build_object('id',t.id,'created_at',t.created_at,'tipo','recuperacao','quant_msg',t.quant_msg,
    'data_inicio',t.data_inicio,'data_final',t.data_final,'status',t.status,
    'mensagem_ativa',CASE WHEN t.mensagem_ativa THEN 'ativa' ELSE 'desativada' END,
    'promocao',t.promocao,'ativa_promocao',t.ativa_promocao,'regras',t.regras,
    'legenda_ativa',CASE WHEN t.legenda_ativa THEN 'ativa' ELSE 'desativada' END,
    'agendamento_ativo',t.agendamento_ativo,'agendamento_tipo',t.agendamento_tipo,
    'agendamento_data_inicio',t.agendamento_data_inicio,'agendamento_data_final',t.agendamento_data_final,
    'agendamento_dias_semana',t.agendamento_dias_semana,'agendamento_horarios',t.agendamento_horarios,
    'agendamento_timezone',t.agendamento_timezone,
    'msg_1',COALESCE(t.mensagens->0->>'mensagem_1',t.mensagens->0->>'mensagem',t.mensagem),
    'img_1',CASE WHEN COALESCE((t.mensagens->0->>'imagem_ativa_1')::boolean,(t.mensagens->0->>'imagem_ativa')::boolean,t.imagem_1_ativa) THEN COALESCE(t.mensagens->0->>'imagem_url_1',t.mensagens->0->>'imagem_url',t.imagem_1_url) ELSE NULL END,
    'legenda_1',COALESCE(t.mensagens->0->>'legenda_1',t.mensagens->0->>'legenda',t.legenda_1),
    'regra_promocao_1',COALESCE(t.mensagens->0->>'regra_promocao_1',t.mensagens->0->>'regra',t.regras),
    'msg_2',CASE WHEN t.quant_msg>=2 THEN COALESCE(t.mensagens->1->>'mensagem_2',t.mensagens->1->>'mensagem',t.mensagem_2) ELSE NULL END,
    'img_2',CASE WHEN t.quant_msg>=2 AND COALESCE((t.mensagens->1->>'imagem_ativa_2')::boolean,(t.mensagens->1->>'imagem_ativa')::boolean,t.imagem_2_ativa) THEN COALESCE(t.mensagens->1->>'imagem_url_2',t.mensagens->1->>'imagem_url',t.imagem_2_url) ELSE NULL END,
    'legenda_2',CASE WHEN t.quant_msg>=2 THEN COALESCE(t.mensagens->1->>'legenda_2',t.mensagens->1->>'legenda',t.legenda_2) ELSE NULL END,
    'regra_promocao_2',CASE WHEN t.quant_msg>=2 THEN COALESCE(t.mensagens->1->>'regra_promocao_2',t.mensagens->1->>'regra',t.regras) ELSE NULL END,
    'msg_3',CASE WHEN t.quant_msg>=3 THEN COALESCE(t.mensagens->2->>'mensagem_3',t.mensagens->2->>'mensagem',t.mensagem_3) ELSE NULL END,
    'img_3',CASE WHEN t.quant_msg>=3 AND COALESCE((t.mensagens->2->>'imagem_ativa_3')::boolean,(t.mensagens->2->>'imagem_ativa')::boolean,t.imagem_3_ativa) THEN COALESCE(t.mensagens->2->>'imagem_url_3',t.mensagens->2->>'imagem_url',t.imagem_3_url) ELSE NULL END,
    'legenda_3',CASE WHEN t.quant_msg>=3 THEN COALESCE(t.mensagens->2->>'legenda_3',t.mensagens->2->>'legenda',t.legenda_3) ELSE NULL END,
    'regra_promocao_3',CASE WHEN t.quant_msg>=3 THEN COALESCE(t.mensagens->2->>'regra_promocao_3',t.mensagens->2->>'regra',t.regras) ELSE NULL END)
  FROM public.recuperacao_clientes t WHERE t.agendamento_ativo=true AND t.next_run_at IS NOT NULL AND t.next_run_at<=now()
 ) UNION ALL (
  SELECT 'promocao_aniversario'::text,t.id,t.next_run_at,
   jsonb_build_object('id',t.id,'created_at',t.created_at,'tipo','aniversario','status',t.status,
    'quant_msg',t.quant_msg,'mensagem_1',t.mensagem_1,'mensagem_2',t.mensagem_2,'mensagem_3',t.mensagem_3,
    'enviado',t.enviado,'imagem_aniversario_1',CASE WHEN t.imagem_1_ativa THEN 'ativa' ELSE 'desativada' END,
    'imagem_aniversario_1_url',t.imagem_1_url,'legenda_1',t.legenda_1,
    'imagem_aniversario_2',CASE WHEN t.imagem_2_ativa THEN 'ativa' ELSE 'desativada' END,
    'imagem_aniversario_2_url',t.imagem_2_url,'legenda_2',t.legenda_2,
    'imagem_aniversario_3',CASE WHEN t.imagem_3_ativa THEN 'ativa' ELSE 'desativada' END,
    'imagem_aniversario_3_url',t.imagem_3_url,'legenda_3',t.legenda_3,
    'agendamento_ativo',t.agendamento_ativo,'agendamento_tipo',t.agendamento_tipo,
    'agendamento_data_inicio',t.agendamento_data_inicio,'agendamento_data_final',t.agendamento_data_final,
    'agendamento_dias_semana',t.agendamento_dias_semana,'agendamento_horarios',t.agendamento_horarios,
    'agendamento_timezone',t.agendamento_timezone)
  FROM public.promocao_aniversario t WHERE t.agendamento_ativo=true AND t.next_run_at IS NOT NULL AND t.next_run_at<=now()
 ) ORDER BY next_run_at ASC LIMIT p_limite;
END;
$$;
REVOKE ALL ON FUNCTION public.buscar_disparos_prontos(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_disparos_prontos(integer) TO service_role;

CREATE FUNCTION public.atualizar_metricas_clientes() RETURNS void
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF current_user NOT IN ('postgres','service_role') AND NOT (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super-admin')
 ) THEN RAISE EXCEPTION 'Somente administradores podem recalcular métricas' USING ERRCODE='42501'; END IF;
 UPDATE public.clientes c SET compras=m.quantidade_pedidos,total_gasto=m.valor_total,ultima_atualizacao=now()
 FROM (
  SELECT whatsapp,count(*) AS quantidade_pedidos,
   sum(COALESCE(NULLIF(regexp_replace(regexp_replace(total,'[^0-9,.]','','g'),',','.','g'),'')::numeric,0)) AS valor_total
  FROM public.pedidos_goodzap GROUP BY whatsapp
 ) m WHERE c.whatsapp=m.whatsapp;
END;
$$;
REVOKE ALL ON FUNCTION public.atualizar_metricas_clientes() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.atualizar_metricas_clientes() TO authenticated,service_role;
COMMENT ON FUNCTION public.atualizar_metricas_clientes() IS 'Preserves the Agent Hub explicit metric refresh workflow. Not an order trigger; admins or service automation call it under table RLS.';