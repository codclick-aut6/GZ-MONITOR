-- lovable-cron-fallback-reviewed: inactivity close is time-based with no triggering event; user controls the cadence from settings
INSERT INTO public.app_settings (key, value) VALUES ('session_idle_minutes','10'),('session_check_minutes','20')
ON CONFLICT (key) DO NOTHING;

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'fechar-sessoes-inativas-whatsapp'),
  command := $cmd$
    UPDATE public.whatsapp_sessions
    SET status = 'closed', closed_at = now(), updated_at = now()
    WHERE status <> 'closed'
      AND updated_at < now() - make_interval(mins => COALESCE(
        (SELECT NULLIF(value,'')::int FROM public.app_settings WHERE key = 'session_idle_minutes'), 10));
  $cmd$
);

CREATE OR REPLACE FUNCTION public.update_session_auto_close(p_idle_minutes int, p_check_minutes int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_schedule text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super-admin') THEN
    RAISE EXCEPTION 'Somente super-admins podem alterar esta configuração';
  END IF;
  IF p_idle_minutes < 1 OR p_idle_minutes > 1440 THEN
    RAISE EXCEPTION 'Tempo de inatividade deve ficar entre 1 e 1440 minutos';
  END IF;
  IF p_check_minutes NOT IN (2,5,10,15,20,30,60) THEN
    RAISE EXCEPTION 'Frequência inválida';
  END IF;
  v_schedule := CASE WHEN p_check_minutes = 60 THEN '0 * * * *' ELSE '*/' || p_check_minutes || ' * * * *' END;

  INSERT INTO public.app_settings (key, value, updated_at) VALUES
    ('session_idle_minutes', p_idle_minutes::text, now()),
    ('session_check_minutes', p_check_minutes::text, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  PERFORM cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'fechar-sessoes-inativas-whatsapp'),
    schedule := v_schedule
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_session_auto_close(int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_session_auto_close(int, int) TO authenticated;