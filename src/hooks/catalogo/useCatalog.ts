/**
 * Hooks do módulo Catálogo — produtos vendáveis e suas categorias.
 *
 * Esta fase entrega só o cadastro (CRUD + categorias). Em fases futuras
 * os produtos serão consumidos pelo módulo de Propostas.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateCatalogCaches } from "@/lib/cacheInvalidation";
import { toast } from "sonner";

export type CatalogSaleType = "saas" | "recurring_service" | "one_shot" | "custom";
export type CatalogPriceMode = "fixed" | "suggested" | "range" | "on_request";
export type CatalogProductStatus = "active" | "in_review" | "archived";
export type CatalogPaymentTerms = "unica" | "mensal" | "anual" | "parcelada";

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogProduct {
  id: string;
  code: string;
  name: string;
  pitch: string | null;
  description: string | null;
  tags: string[];
  category_id: string | null;
  image_url: string | null;
  sale_type: CatalogSaleType;
  price_mode: CatalogPriceMode;
  price_value: number | null;
  price_min: number | null;
  price_max: number | null;
  billing_unit: string;
  default_payment_terms: CatalogPaymentTerms;
  default_quantity: number;
  status: CatalogProductStatus;
  owner_actor_id: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogProductFilters {
  search?: string;
  saleType?: CatalogSaleType | "all";
  categoryId?: string | "all";
  showArchived?: boolean;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

// =============== CATEGORIES ===============

export function useCatalogCategories(opts: { includeArchived?: boolean } = {}) {
  return useQuery({
    queryKey: ["catalog-categories", { includeArchived: !!opts.includeArchived }],
    queryFn: async () => {
      let q = supabase.from("catalog_categories").select("*").order("display_order").order("name");
      if (!opts.includeArchived) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CatalogCategory[];
    },
  });
}

export function useUpsertCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; color?: string | null }) => {
      const payload: any = {
        name: input.name.trim(),
        slug: slugify(input.name),
        color: input.color ?? null,
      };
      if (input.id) {
        const { data, error } = await supabase
          .from("catalog_categories")
          .update({ name: payload.name, color: payload.color })
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("catalog_categories").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateCatalogCaches(qc);
      toast.success("Categoria salva");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar categoria"),
  });
}

export function useToggleCategoryArchive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await supabase
        .from("catalog_categories")
        .update({ is_active: !archive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      invalidateCatalogCaches(qc);
      toast.success(vars.archive ? "Categoria arquivada" : "Categoria reativada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

// =============== PRODUCTS ===============

export function useCatalogProducts(filters: CatalogProductFilters = {}) {
  return useQuery({
    queryKey: ["catalog-products", filters],
    queryFn: async () => {
      let q = supabase
        .from("catalog_products")
        .select("*, catalog_categories(id,name,color)")
        .order("updated_at", { ascending: false });
      if (!filters.showArchived) q = q.neq("status", "archived");
      if (filters.saleType && filters.saleType !== "all") q = q.eq("sale_type", filters.saleType);
      if (filters.categoryId && filters.categoryId !== "all") q = q.eq("category_id", filters.categoryId);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as any[];
      if (filters.search?.trim()) {
        const s = filters.search.trim().toLowerCase();
        rows = rows.filter(
          (r) =>
            r.name?.toLowerCase().includes(s) ||
            r.code?.toLowerCase().includes(s) ||
            (r.tags ?? []).some((t: string) => t.toLowerCase().includes(s)) ||
            r.catalog_categories?.name?.toLowerCase().includes(s),
        );
      }
      return rows as (CatalogProduct & { catalog_categories: { id: string; name: string; color: string | null } | null })[];
    },
  });
}

export function useCatalogProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["catalog-product", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("catalog_products").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as CatalogProduct;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CatalogProduct>) => {
      const { data, error } = await supabase
        .from("catalog_products")
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data as CatalogProduct;
    },
    onSuccess: (d) => {
      invalidateCatalogCaches(qc, { productId: d.id });
      toast.success("Produto criado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar produto"),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CatalogProduct> }) => {
      const { data, error } = await supabase
        .from("catalog_products")
        .update(patch as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CatalogProduct;
    },
    onSuccess: (d) => {
      invalidateCatalogCaches(qc, { productId: d.id });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

export function useArchiveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await supabase
        .from("catalog_products")
        .update({ status: archive ? "archived" : "active" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      invalidateCatalogCaches(qc, { productId: vars.id });
      toast.success(vars.archive ? "Produto arquivado" : "Produto reativado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useDuplicateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: src, error: e1 } = await supabase
        .from("catalog_products")
        .select("*")
        .eq("id", id)
        .single();
      if (e1) throw e1;
      const { id: _i, code: _c, created_at: _ca, updated_at: _ua, ...rest } = src as any;
      const copy = { ...rest, name: `${src.name} (cópia)`, status: "in_review" as const };
      const { data, error } = await supabase.from("catalog_products").insert(copy).select().single();
      if (error) throw error;
      return data as CatalogProduct;
    },
    onSuccess: (d) => {
      invalidateCatalogCaches(qc, { productId: d.id });
      toast.success("Produto duplicado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao duplicar"),
  });
}

// =============== LABELS ===============

export const SALE_TYPE_LABEL: Record<CatalogSaleType, string> = {
  saas: "SaaS próprio",
  recurring_service: "Serviço recorrente",
  one_shot: "Serviço one-shot",
  custom: "Sob medida",
};

export const PRICE_MODE_LABEL: Record<CatalogPriceMode, string> = {
  fixed: "Preço fixo",
  suggested: "Preço sugerido",
  range: "Faixa de preço",
  on_request: "Sob consulta",
};

export const PAYMENT_TERMS_LABEL: Record<CatalogPaymentTerms, string> = {
  unica: "Pagamento único",
  mensal: "Mensal",
  anual: "Anual",
  parcelada: "Parcelada",
};

export const BILLING_UNITS = [
  { value: "unica", label: "Única" },
  { value: "mes", label: "Por mês" },
  { value: "hora", label: "Por hora" },
  { value: "usuario", label: "Por usuário" },
  { value: "projeto", label: "Por projeto" },
] as const;

export const STATUS_LABEL: Record<CatalogProductStatus, string> = {
  active: "Ativo",
  in_review: "Em revisão",
  archived: "Arquivado",
};
