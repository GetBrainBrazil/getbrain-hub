-- Permitir que admins excluam qualquer item das tabelas de referência do CRM,
-- inclusive os marcados como "padrão" (is_system=true). A regra anterior
-- bloqueava exclusão de itens de sistema, mas como TODA a semente inicial
-- vem como is_system=true, isso impedia o admin de limpar a lista.

-- Categorias de dor
DROP POLICY IF EXISTS crm_pain_categories_delete_admin_non_system ON public.crm_pain_categories;
CREATE POLICY crm_pain_categories_delete_admin
  ON public.crm_pain_categories
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Tipos de projeto
DROP POLICY IF EXISTS crm_project_types_delete_admin_non_system ON public.crm_project_types;
CREATE POLICY crm_project_types_delete_admin
  ON public.crm_project_types
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Origens de lead
DROP POLICY IF EXISTS crm_lead_sources_delete_admin_non_system ON public.crm_lead_sources;
CREATE POLICY crm_lead_sources_delete_admin
  ON public.crm_lead_sources
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Papéis de contato
DROP POLICY IF EXISTS crm_contact_roles_delete_admin_non_system ON public.crm_contact_roles;
CREATE POLICY crm_contact_roles_delete_admin
  ON public.crm_contact_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));