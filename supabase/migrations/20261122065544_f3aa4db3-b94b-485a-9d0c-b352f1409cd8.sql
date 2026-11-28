ALTER TABLE public.promocoes_goodzap ADD COLUMN IF NOT EXISTS validade date, ADD COLUMN IF NOT EXISTS utm text;
ALTER TABLE public.goodzap_sistema ADD COLUMN IF NOT EXISTS url_cardapio text NOT NULL DEFAULT '';
GRANT SELECT (url_cardapio) ON public.goodzap_sistema TO authenticated;