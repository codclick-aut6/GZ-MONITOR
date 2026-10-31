GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_sessions TO authenticated;
GRANT ALL ON public.whatsapp_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sessions" ON public.whatsapp_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sessions" ON public.whatsapp_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sessions" ON public.whatsapp_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read messages" ON public.whatsapp_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert messages" ON public.whatsapp_messages FOR INSERT TO authenticated WITH CHECK (true);