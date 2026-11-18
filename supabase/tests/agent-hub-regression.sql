-- Run through the database tool. Each subtransaction deliberately rolls back.
-- Explicit negative IDs keep sequence counters untouched.
DO $regression$
DECLARE
  v_table text;
  v_next timestamptz;
  v_count bigint;
  v_total numeric;
  v_original_role text := current_user;
  v_phone text := '__agent_hub_regression__' || gen_random_uuid()::text;
  v_tables text[] := ARRAY['cardapio','cardapio2','bebidas','borda_recheada','outros_produtos','empresa_info','area_entrega','faixas_frete','horario_empresa_goodzap','horarios_goodzap','keep_alive','configuracoes_goodzap','saudacoes_goodzap','telefones_admin_goodzap','numeros_especiais','clientes','pedidos_goodzap','reservas','clientes_clickflow','promocoes_goodzap','promocao_aniversario','recuperacao_clientes','webhooks_campanhas'];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.'||v_table)) THEN
      RAISE EXCEPTION 'RLS missing for %',v_table;
    END IF;
    IF has_table_privilege('anon','public.'||v_table,'SELECT') THEN
      RAISE EXCEPTION 'Public read allowed for %',v_table;
    END IF;
    IF NOT has_table_privilege('authenticated','public.'||v_table,'SELECT') OR NOT has_table_privilege('service_role','public.'||v_table,'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'Required grants missing for %',v_table;
    END IF;
    IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename=v_table AND policyname IN ('agent_hub_team_read','agent_hub_admin_write'))<>2 THEN
      RAISE EXCEPTION 'Access policies missing for %',v_table;
    END IF;
  END LOOP;
  IF has_function_privilege('anon','public.buscar_disparos_prontos(integer)','EXECUTE') OR has_function_privilege('authenticated','public.buscar_disparos_prontos(integer)','EXECUTE') THEN
    RAISE EXCEPTION 'Automation-only function exposed';
  END IF;
  IF NOT has_function_privilege('service_role','public.buscar_disparos_prontos(integer)','EXECUTE') THEN
    RAISE EXCEPTION 'Service automation access missing';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND (table_name='empresa_info' AND column_name='token' OR table_name='webhooks_campanhas' AND column_name='comunicacao_apikey')) THEN
    RAISE EXCEPTION 'Provider credentials must not be team-readable';
  END IF;

  -- Exercise service writes and team read-only RLS, not just catalog grants.
  BEGIN
    PERFORM set_config('role','service_role',true);
    INSERT INTO public.clientes(id,whatsapp,nome) VALUES(-900000000000006,v_phone,'Teste RLS');
    PERFORM public.buscar_disparos_prontos(1);
    PERFORM set_config('role','authenticated',true);
    SELECT count(*) INTO v_count FROM public.clientes WHERE id=-900000000000006;
    IF v_count<>1 THEN RAISE EXCEPTION 'Team cannot read service-created customer'; END IF;
    UPDATE public.clientes SET nome='Forbidden' WHERE id=-900000000000006;
    GET DIAGNOSTICS v_count=ROW_COUNT;
    IF v_count<>0 THEN RAISE EXCEPTION 'Non-admin team member updated customer'; END IF;
    DELETE FROM public.clientes WHERE id=-900000000000006;
    GET DIAGNOSTICS v_count=ROW_COUNT;
    IF v_count<>0 THEN RAISE EXCEPTION 'Non-admin team member deleted customer'; END IF;
    BEGIN
      INSERT INTO public.clientes(id,whatsapp) VALUES(-900000000000007,v_phone);
      RAISE EXCEPTION 'Non-admin team member created customer';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    PERFORM set_config('role',v_original_role,true);
    RAISE EXCEPTION 'rollback successful RLS test' USING ERRCODE='ZX001';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;

  -- Campaign writes compute a time; disabling must erase it.
  BEGIN
    INSERT INTO public.promocoes_goodzap(id,promocao,agendamento_ativo,agendamento_tipo,agendamento_data_inicio,agendamento_data_final,agendamento_horarios)
    VALUES(-900000000000001,v_phone,true,'periodo',(now() AT TIME ZONE 'America/Sao_Paulo')::date+1,(now() AT TIME ZONE 'America/Sao_Paulo')::date+1,ARRAY['12:00']) RETURNING next_run_at INTO v_next;
    IF v_next IS DISTINCT FROM ((((now() AT TIME ZONE 'America/Sao_Paulo')::date+1)::text||' 12:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo') THEN
      RAISE EXCEPTION 'Campaign timezone calculation mismatch';
    END IF;
    UPDATE public.promocoes_goodzap SET agendamento_ativo=false WHERE id=-900000000000001 RETURNING next_run_at INTO v_next;
    IF v_next IS NOT NULL THEN RAISE EXCEPTION 'Disabled campaign retained next run'; END IF;
    INSERT INTO public.recuperacao_clientes(id,quant_msg,mensagens) VALUES(-900000000000002,4,'[{"mensagem":"Teste"}]');
    IF (SELECT jsonb_typeof(mensagens) FROM public.recuperacao_clientes WHERE id=-900000000000002)<>'array' THEN
      RAISE EXCEPTION 'JSON campaign messages not preserved';
    END IF;
    RAISE EXCEPTION 'rollback successful campaign test' USING ERRCODE='ZX001';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;

  -- Explicit metric refresh reads inserted orders and writes customer totals.
  BEGIN
    INSERT INTO public.clientes(id,whatsapp,nome) VALUES(-900000000000003,v_phone,'Teste');
    INSERT INTO public.pedidos_goodzap(id,codigo_pedido,endereco,nome,pedido,sessao,total,whatsapp)
    VALUES(-900000000000004,'teste-1','Teste','Teste','Teste','teste','R$ 25,50',v_phone),
          (-900000000000005,'teste-2','Teste','Teste','Teste','teste','10,00',v_phone);
    PERFORM public.atualizar_metricas_clientes();
    SELECT compras,total_gasto INTO v_count,v_total FROM public.clientes WHERE id=-900000000000003;
    IF v_count IS DISTINCT FROM 2::bigint OR v_total IS DISTINCT FROM 35.50::numeric THEN
      RAISE EXCEPTION 'Order metrics mismatch: %, %',v_count,v_total;
    END IF;
    RAISE EXCEPTION 'rollback successful metric test' USING ERRCODE='ZX001';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
  IF EXISTS(SELECT 1 FROM public.clientes WHERE whatsapp=v_phone) OR EXISTS(SELECT 1 FROM public.promocoes_goodzap WHERE promocao=v_phone) THEN
    RAISE EXCEPTION 'Regression data was not rolled back';
  END IF;
END;
$regression$;