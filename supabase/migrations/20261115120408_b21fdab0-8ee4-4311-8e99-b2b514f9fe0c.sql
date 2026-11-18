ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';
ALTER TABLE public.tokens ADD COLUMN token_role public.app_role NOT NULL DEFAULT 'attendant';
COMMENT ON COLUMN public.tokens.token_role IS 'Compatibility metadata for imported Agent Hub invitations. The panel signup remains unchanged and assigns attendant; role assignment must only be implemented through trusted server validation.';