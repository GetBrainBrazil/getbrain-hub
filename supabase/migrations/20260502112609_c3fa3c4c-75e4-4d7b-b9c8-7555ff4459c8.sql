CREATE OR REPLACE FUNCTION public.proposals_validate_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  ok boolean := false;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Transições permitidas
  ok := (OLD.status = 'rascunho' AND NEW.status IN ('enviada','recusada','convertida'))
     OR (OLD.status = 'enviada' AND NEW.status IN ('rascunho','visualizada','recusada','expirada','convertida'))
     OR (OLD.status = 'visualizada' AND NEW.status IN ('interesse_manifestado','recusada','expirada','convertida'))
     OR (OLD.status = 'interesse_manifestado' AND NEW.status IN ('recusada','expirada','convertida'))
     OR (OLD.status IN ('expirada','recusada') AND NEW.status IN ('rascunho','convertida'));

  IF NOT ok THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END $$;