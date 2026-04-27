-- Backup obrigatório
CREATE TABLE _backup_projects_text_fields_pre_v1_9 AS
SELECT
  id, code, acceptance_criteria, deliverables, premises,
  identified_risks, technical_stack, NOW() AS backup_taken_at
FROM projects
WHERE deleted_at IS NULL;

COMMENT ON TABLE _backup_projects_text_fields_pre_v1_9 IS
  'Backup dos 5 campos TEXT de projects antes da migração v1.9 para tipos estruturados. Pode ser dropado após validação completa em produção (>30 dias).';

-- Funções helper temporárias (subqueries não são permitidas em USING de ALTER COLUMN TYPE)
CREATE OR REPLACE FUNCTION pg_temp.convert_md_checklist_to_jsonb(input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result JSONB := '[]'::jsonb;
  line TEXT;
  rn INT := 0;
  is_checked BOOLEAN;
  txt TEXT;
BEGIN
  IF input IS NULL OR TRIM(input) = '' THEN
    RETURN '[]'::jsonb;
  END IF;
  FOREACH line IN ARRAY REGEXP_SPLIT_TO_ARRAY(input, E'\n') LOOP
    IF TRIM(line) = '' OR line !~ '^\s*-\s*\[' THEN
      CONTINUE;
    END IF;
    rn := rn + 1;
    is_checked := line ~* '^\s*-\s*\[[xX]\]';
    txt := TRIM(REGEXP_REPLACE(line, '^\s*-\s*\[[ xX]\]\s*', ''));
    result := result || jsonb_build_array(jsonb_build_object(
      'id', 'ac_' || rn,
      'text', txt,
      'checked', is_checked,
      'checked_at', NULL,
      'checked_by', NULL
    ));
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.convert_md_bullets_to_array(input TEXT, clean_item_prefix BOOLEAN DEFAULT FALSE)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result TEXT[] := ARRAY[]::TEXT[];
  line TEXT;
  cleaned TEXT;
BEGIN
  IF input IS NULL OR TRIM(input) = '' THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  FOREACH line IN ARRAY REGEXP_SPLIT_TO_ARRAY(input, E'\n') LOOP
    IF TRIM(line) = '' OR line !~ '^\s*-\s*' THEN
      CONTINUE;
    END IF;
    cleaned := TRIM(REGEXP_REPLACE(line, '^\s*-\s*', ''));
    IF clean_item_prefix THEN
      cleaned := TRIM(REGEXP_REPLACE(cleaned, '^item([A-Za-z]+):\s*', '\1: '));
    END IF;
    result := array_append(result, cleaned);
  END LOOP;
  RETURN result;
END;
$$;

-- 1. acceptance_criteria: TEXT -> JSONB
ALTER TABLE projects ALTER COLUMN acceptance_criteria DROP DEFAULT;
ALTER TABLE projects
  ALTER COLUMN acceptance_criteria TYPE JSONB
  USING pg_temp.convert_md_checklist_to_jsonb(acceptance_criteria);
ALTER TABLE projects
  ALTER COLUMN acceptance_criteria SET DEFAULT '[]'::jsonb,
  ALTER COLUMN acceptance_criteria SET NOT NULL;

-- 2. deliverables: TEXT -> TEXT[]
ALTER TABLE projects ALTER COLUMN deliverables DROP DEFAULT;
ALTER TABLE projects
  ALTER COLUMN deliverables TYPE TEXT[]
  USING pg_temp.convert_md_bullets_to_array(deliverables, FALSE);
ALTER TABLE projects
  ALTER COLUMN deliverables SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN deliverables SET NOT NULL;

-- 3. premises: TEXT -> TEXT[] (com limpeza de itemXxx:)
ALTER TABLE projects ALTER COLUMN premises DROP DEFAULT;
ALTER TABLE projects
  ALTER COLUMN premises TYPE TEXT[]
  USING pg_temp.convert_md_bullets_to_array(premises, TRUE);
ALTER TABLE projects
  ALTER COLUMN premises SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN premises SET NOT NULL;

-- 4. identified_risks: TEXT -> TEXT[]
ALTER TABLE projects ALTER COLUMN identified_risks DROP DEFAULT;
ALTER TABLE projects
  ALTER COLUMN identified_risks TYPE TEXT[]
  USING pg_temp.convert_md_bullets_to_array(identified_risks, FALSE);
ALTER TABLE projects
  ALTER COLUMN identified_risks SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN identified_risks SET NOT NULL;

-- 5. technical_stack: TEXT -> TEXT[]
ALTER TABLE projects ALTER COLUMN technical_stack DROP DEFAULT;
ALTER TABLE projects
  ALTER COLUMN technical_stack TYPE TEXT[]
  USING pg_temp.convert_md_bullets_to_array(technical_stack, FALSE);
ALTER TABLE projects
  ALTER COLUMN technical_stack SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN technical_stack SET NOT NULL;