CREATE OR REPLACE FUNCTION public.cascade_delete_deal(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_lead_id uuid;
  v_movs int := 0;
  v_recs int := 0;
  v_contracts int := 0;
  v_proposals int := 0;
  v_project_deleted boolean := false;
BEGIN
  IF p_deal_id IS NULL THEN
    RAISE EXCEPTION 'deal_id é obrigatório';
  END IF;

  -- Descobre o projeto vinculado (por qualquer um dos lados da FK)
  SELECT id INTO v_project_id FROM public.projects WHERE source_deal_id = p_deal_id LIMIT 1;
  IF v_project_id IS NULL THEN
    SELECT generated_project_id INTO v_project_id FROM public.deals WHERE id = p_deal_id;
  END IF;

  -- Lead de origem (será desvinculado pelo trigger já existente quando o deal for apagado)
  SELECT id INTO v_lead_id FROM public.leads WHERE converted_to_deal_id = p_deal_id LIMIT 1;

  -- 1) Limpa o que está pendurado no PROJETO (se existir)
  IF v_project_id IS NOT NULL THEN
    -- Movimentações financeiras (FK SET NULL, mas removemos para limpar histórico)
    DELETE FROM public.movimentacoes WHERE projeto_id = v_project_id;
    GET DIAGNOSTICS v_movs = ROW_COUNT;

    -- Recorrências financeiras (FK NO ACTION → precisa apagar antes do projeto)
    DELETE FROM public.financial_recurrences WHERE projeto_id = v_project_id;
    GET DIAGNOSTICS v_recs = ROW_COUNT;

    -- Contratos de manutenção (FK RESTRICT)
    DELETE FROM public.maintenance_contracts WHERE project_id = v_project_id;
    GET DIAGNOSTICS v_contracts = ROW_COUNT;

    -- Propostas vinculadas ao projeto (FK NO ACTION)
    DELETE FROM public.proposals WHERE project_id = v_project_id;

    -- Apaga o projeto (project_actors, milestones, risks, dependencies, integrations
    -- são CASCADE — caem junto)
    DELETE FROM public.projects WHERE id = v_project_id;
    v_project_deleted := true;
  END IF;

  -- 2) Propostas vinculadas direto ao DEAL (não ao projeto)
  DELETE FROM public.proposals WHERE deal_id = p_deal_id;
  GET DIAGNOSTICS v_proposals = ROW_COUNT;

  -- 3) Atividades e dependências do deal (já são CASCADE, mas garantimos contagem)
  DELETE FROM public.deal_activities WHERE deal_id = p_deal_id;
  DELETE FROM public.deal_dependencies WHERE deal_id = p_deal_id;

  -- 4) Apaga o deal (o lead será revertido pelo trigger trg_lead_revert_on_deal_delete)
  DELETE FROM public.deals WHERE id = p_deal_id;

  RETURN jsonb_build_object(
    'project_deleted', v_project_deleted,
    'project_id', v_project_id,
    'lead_reverted_id', v_lead_id,
    'movimentacoes_deleted', v_movs,
    'recurrences_deleted', v_recs,
    'contracts_deleted', v_contracts,
    'proposals_deleted', v_proposals
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cascade_delete_deal(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cascade_delete_deal(uuid) TO authenticated;
