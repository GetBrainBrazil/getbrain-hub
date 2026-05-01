-- RPC: criar proposta nova a partir de um deal, importando dor/solução/escopo
CREATE OR REPLACE FUNCTION public.create_proposal_from_deal(
  p_deal_id uuid,
  p_force_new_version boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal record;
  v_company record;
  v_existing_id uuid;
  v_existing_code text;
  v_proposal_id uuid;
  v_proposal_code text;
  v_uid uuid;
  v_company_name text;
  v_slug text;
  v_default_password text;
  v_welcome text;
  v_valid_until date;
  v_deliverables text[];
  v_item text;
  v_idx int := 0;
  v_audit_actor uuid;
BEGIN
  v_uid := auth.uid();

  -- 1) Valida deal
  SELECT * INTO v_deal FROM public.deals
  WHERE id = p_deal_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal não encontrado'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_deal.company_id IS NULL THEN
    RAISE EXCEPTION 'Deal precisa ter cliente vinculado antes de gerar proposta'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2) Lê empresa
  SELECT * INTO v_company FROM public.companies
  WHERE id = v_deal.company_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa do deal não encontrada'
      USING ERRCODE = 'P0002';
  END IF;

  v_company_name := COALESCE(NULLIF(v_company.trade_name, ''), v_company.legal_name);

  -- 3) Verifica conflito (proposta ativa em rascunho/enviada)
  SELECT id, code INTO v_existing_id, v_existing_code
  FROM public.proposals
  WHERE deal_id = p_deal_id
    AND deleted_at IS NULL
    AND status IN ('rascunho', 'enviada')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND AND NOT p_force_new_version THEN
    RETURN jsonb_build_object(
      'conflict', true,
      'existing_proposal_id', v_existing_id,
      'existing_proposal_code', v_existing_code,
      'message', format('Já existe proposta %s vinculada a este deal.', v_existing_code)
    );
  END IF;

  -- 4) Computa defaults
  v_slug := lower(regexp_replace(
    translate(
      v_company_name,
      'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
    ),
    '[^A-Za-z0-9]', '', 'g'
  ));
  IF v_slug IS NULL OR v_slug = '' THEN
    v_slug := 'cliente';
  END IF;
  v_default_password := v_slug || '@2026';

  v_welcome := format('Olá! Esta é a proposta preparada especialmente para %s.', v_company_name);
  v_valid_until := (now() + interval '30 days')::date;

  v_deliverables := COALESCE(v_deal.deliverables, ARRAY[]::text[]);

  -- 5) Insere proposta
  INSERT INTO public.proposals (
    organization_id,
    deal_id,
    company_id,
    status,
    client_company_name,
    client_logo_url,
    pain_context,
    solution_overview,
    welcome_message,
    valid_until,
    expires_at,
    validation_days,
    scope_items,
    created_by,
    updated_by
  ) VALUES (
    v_deal.organization_id,
    p_deal_id,
    v_deal.company_id,
    'rascunho',
    v_company_name,
    v_company.logo_url,
    v_deal.pain_description,
    v_deal.scope_summary,
    v_welcome,
    v_valid_until,
    v_valid_until,
    30,
    '[]'::jsonb,
    v_uid,
    v_uid
  )
  RETURNING id, code INTO v_proposal_id, v_proposal_code;

  -- 6) Cria proposal_items a partir dos deliverables
  IF array_length(v_deliverables, 1) IS NULL THEN
    INSERT INTO public.proposal_items (
      proposal_id, description, quantity, unit_price, order_index, created_by, updated_by
    ) VALUES (
      v_proposal_id, 'Definir escopo', 1, 0, 0, v_uid, v_uid
    );
  ELSE
    FOREACH v_item IN ARRAY v_deliverables LOOP
      INSERT INTO public.proposal_items (
        proposal_id, description, detailed_description,
        quantity, unit_price, order_index, created_by, updated_by
      ) VALUES (
        v_proposal_id,
        -- primeira linha como description
        split_part(v_item, E'\n', 1),
        -- corpo restante (tudo após a 1ª linha) como detailed
        NULLIF(regexp_replace(v_item, '^[^\n]*\n?', ''), ''),
        1, 0, v_idx, v_uid, v_uid
      );
      v_idx := v_idx + 1;
    END LOOP;
  END IF;

  -- 7) Vínculo bidirecional: deal aponta pra proposta
  -- (Se p_force_new_version, a proposta antiga fica como estava; Daniel decide depois)
  UPDATE public.deals
  SET proposal_id = v_proposal_id,
      updated_at = now(),
      updated_by = v_uid
  WHERE id = p_deal_id;

  -- 8) Audit log
  v_audit_actor := v_uid;
  INSERT INTO public.audit_logs (
    organization_id, actor_id, entity_type, entity_id, action, metadata
  ) VALUES (
    v_deal.organization_id,
    v_audit_actor,
    'proposal',
    v_proposal_id,
    'custom',
    jsonb_build_object(
      'event', 'created_from_deal',
      'deal_id', p_deal_id,
      'deal_code', v_deal.code,
      'forced_new_version', p_force_new_version,
      'previous_proposal_code', v_existing_code
    )
  );

  RETURN jsonb_build_object(
    'conflict', false,
    'proposal_id', v_proposal_id,
    'proposal_code', v_proposal_code,
    'default_password_plain', v_default_password,
    'company_name', v_company_name,
    'items_imported', GREATEST(v_idx, CASE WHEN array_length(v_deliverables,1) IS NULL THEN 1 ELSE 0 END)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_proposal_from_deal(uuid, boolean) TO authenticated;