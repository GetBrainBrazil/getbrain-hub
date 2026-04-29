
ALTER FUNCTION public.gen_proposal_access_token() SET search_path = public;
ALTER FUNCTION public.proposals_set_access_token() SET search_path = public;
ALTER FUNCTION public.proposals_validate_status_transition() SET search_path = public;
ALTER FUNCTION public.proposals_require_password_when_sent() SET search_path = public;
ALTER FUNCTION public.proposals_set_sent_at() SET search_path = public;
ALTER FUNCTION public.deals_mark_proposal_converted() SET search_path = public;

ALTER VIEW public.proposal_metrics SET (security_invoker = on);
