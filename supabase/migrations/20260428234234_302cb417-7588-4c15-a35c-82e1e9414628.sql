CREATE OR REPLACE FUNCTION public.crm_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new jsonb := to_jsonb(NEW);
  v_old jsonb := to_jsonb(OLD);
  v_row jsonb;
  v_org uuid;
  v_actor uuid;
  v_entity_id uuid;
  v_uid uuid;
BEGIN
  v_row := COALESCE(v_new, v_old);
  v_org := COALESCE((v_row->>'organization_id')::uuid, public.getbrain_org_id());
  v_entity_id := (v_row->>'id')::uuid;
  v_uid := auth.uid();

  -- 1) Try fields written explicitly by the app
  v_actor := COALESCE(
    (v_row->>'updated_by')::uuid,
    (v_row->>'created_by')::uuid,
    (v_row->>'updated_by_actor_id')::uuid,
    (v_row->>'created_by_actor_id')::uuid
  );

  -- 2) Fallback: resolve auth.uid() -> actor (via humans.auth_user_id)
  IF v_actor IS NULL AND v_uid IS NOT NULL THEN
    SELECT actor_id INTO v_actor FROM public.humans WHERE auth_user_id = v_uid LIMIT 1;
  END IF;

  -- 3) Last resort: use owner so the row at least shows someone responsible
  IF v_actor IS NULL THEN
    v_actor := (v_row->>'owner_actor_id')::uuid;
  END IF;

  INSERT INTO public.audit_logs (organization_id, actor_id, entity_type, entity_id, action, changes, metadata)
  VALUES (
    v_org,
    v_actor,
    TG_TABLE_NAME,
    v_entity_id,
    CASE TG_OP WHEN 'INSERT' THEN 'create'::public.audit_action WHEN 'UPDATE' THEN 'update'::public.audit_action ELSE 'delete'::public.audit_action END,
    jsonb_build_object('old_data', v_old, 'new_data', v_new),
    jsonb_build_object(
      'source', 'crm_audit_trigger',
      'auth_uid', v_uid
    )
  );
  RETURN COALESCE(NEW, OLD);
END
$function$;

-- Backfill: try to resolve actor_id for existing rows using owner_actor_id from new_data
UPDATE public.audit_logs
SET actor_id = (changes->'new_data'->>'owner_actor_id')::uuid
WHERE actor_id IS NULL
  AND changes ? 'new_data'
  AND (changes->'new_data'->>'owner_actor_id') IS NOT NULL;