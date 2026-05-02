ALTER TABLE public.proposal_items
  ADD COLUMN IF NOT EXISTS long_description text;

UPDATE public.proposal_items pi
SET long_description = (p.scope_items -> pi.order_index ->> 'description')
FROM public.proposals p
WHERE pi.proposal_id = p.id
  AND p.scope_items IS NOT NULL
  AND jsonb_typeof(p.scope_items) = 'array'
  AND (p.scope_items -> pi.order_index ->> 'description') IS NOT NULL
  AND (pi.long_description IS NULL OR pi.long_description = '');