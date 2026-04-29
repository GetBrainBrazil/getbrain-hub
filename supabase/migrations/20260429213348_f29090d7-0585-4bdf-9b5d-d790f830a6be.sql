CREATE OR REPLACE FUNCTION public.gen_proposal_access_token()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE t text;
BEGIN
  t := encode(extensions.gen_random_bytes(24), 'base64');
  t := replace(replace(replace(t, '+', '-'), '/', '_'), '=', '');
  RETURN substring(t from 1 for 32);
END $function$;

CREATE OR REPLACE FUNCTION public.set_proposal_password(_proposal_id uuid, _plain_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF _plain_password IS NULL OR length(_plain_password) < 4 THEN
    RAISE EXCEPTION 'Senha deve ter pelo menos 4 caracteres';
  END IF;
  UPDATE public.proposals
  SET access_password_hash = extensions.crypt(_plain_password, extensions.gen_salt('bf'))
  WHERE id = _proposal_id;
END $function$;