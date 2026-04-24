ALTER VIEW public.crm_pipeline_metrics SET (security_invoker = true);

DROP POLICY IF EXISTS leads_authenticated ON public.leads;
DROP POLICY IF EXISTS deals_authenticated ON public.deals;
DROP POLICY IF EXISTS deal_activities_authenticated ON public.deal_activities;

CREATE POLICY leads_authenticated
ON public.leads
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY deals_authenticated
ON public.deals
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY deal_activities_authenticated
ON public.deal_activities
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);