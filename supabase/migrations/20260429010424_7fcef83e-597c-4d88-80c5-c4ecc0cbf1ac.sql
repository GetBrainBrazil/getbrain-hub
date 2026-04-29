-- Convert deals.project_type_v2 from text to text[] preserving existing data
ALTER TABLE public.deals
  ALTER COLUMN project_type_v2 DROP DEFAULT,
  ALTER COLUMN project_type_v2 TYPE text[]
    USING (
      CASE
        WHEN project_type_v2 IS NULL OR project_type_v2 = '' THEN '{}'::text[]
        ELSE ARRAY[project_type_v2]
      END
    ),
  ALTER COLUMN project_type_v2 SET DEFAULT '{}'::text[],
  ALTER COLUMN project_type_v2 SET NOT NULL;

-- Helpful index for filtering by project type
CREATE INDEX IF NOT EXISTS idx_deals_project_type_v2 ON public.deals USING GIN (project_type_v2);