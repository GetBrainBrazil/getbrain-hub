import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Archive, ArchiveRestore, Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductForm, ProductFormValues, emptyProductForm } from "@/components/catalogo/ProductForm";
import {
  useCatalogProduct,
  useCreateProduct,
  useUpdateProduct,
  useArchiveProduct,
  useDuplicateProduct,
} from "@/hooks/catalogo/useCatalog";
import { useConfirm } from "@/components/ConfirmDialog";
import { toast } from "sonner";

function validate(v: ProductFormValues) {
  const errors: Record<string, string> = {};
  if (!v.name?.trim()) errors.name = "Nome é obrigatório";
  if (!v.category_id) errors.category_id = "Selecione uma categoria";
  switch (v.archetype) {
    case "one_shot":
      if (v.oneshot_value == null || v.oneshot_value < 0) errors.oneshot_value = "Valor obrigatório";
      break;
    case "saas":
      if (v.recurring_value == null || v.recurring_value < 0) errors.recurring_value = "Mensalidade obrigatória";
      break;
    case "hybrid":
      if (v.setup_value == null || v.setup_value < 0) errors.setup_value = "Setup obrigatório";
      if (v.recurring_value == null || v.recurring_value < 0) errors.recurring_value = "Mensalidade obrigatória";
      break;
    case "with_maintenance":
      if (v.recurring_value == null || v.recurring_value < 0) errors.recurring_value = "Manutenção mensal obrigatória";
      break;
    case "aggregator":
      // sem valor
      break;
  }
  return errors;
}

export default function ProdutoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === "novo";

  const { data: product, isLoading } = useCatalogProduct(isNew ? undefined : id);
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const archive = useArchiveProduct();
  const duplicate = useDuplicateProduct();
  const { confirm, dialog } = useConfirm();

  const [form, setForm] = useState<ProductFormValues>(emptyProductForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isNew) {
      setForm(emptyProductForm);
      setErrors({});
      return;
    }
    if (product) {
      setForm({
        ...emptyProductForm,
        ...product,
        tags: product.tags ?? [],
      });
    }
  }, [isNew, product]);

  const handleChange = (patch: Partial<ProductFormValues>) => {
    setForm((f) => ({ ...f, ...patch }));
  };

  const handleSave = async () => {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Corrija os campos destacados");
      return;
    }
    if (isNew) {
      const created = await create.mutateAsync(form);
      navigate(`/catalogo?highlight=${created.id}`);
    } else {
      await update.mutateAsync({ id: id!, patch: form });
      toast.success("Produto atualizado");
    }
  };

  const handleArchive = async () => {
    if (!product) return;
    const isArchived = product.status === "archived";
    if (!isArchived) {
      const ok = await confirm({
        title: "Arquivar produto?",
        description: "Produtos arquivados não aparecem em novas propostas, mas continuam preservados.",
        confirmLabel: "Arquivar",
        variant: "default",
      });
      if (!ok) return;
    }
    await archive.mutateAsync({ id: product.id, archive: !isArchived });
  };

  const handleDuplicate = async () => {
    if (!product) return;
    const created = await duplicate.mutateAsync(product.id);
    navigate(`/catalogo/${created.id}`);
  };

  if (!isNew && isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-1 pb-12 animate-fade-in">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Button size="sm" variant="ghost" onClick={() => navigate("/catalogo")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold font-display truncate sm:text-xl">
              {isNew ? "Novo Produto" : form.name || "Produto"}
            </h1>
            {!isNew && product && (
              <div className="text-xs text-muted-foreground font-mono">{product.code}</div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && product && (
            <>
              <Button variant="outline" size="sm" onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-1" /> Duplicar
              </Button>
              <Button variant="outline" size="sm" onClick={handleArchive}>
                {product.status === "archived" ? (
                  <><ArchiveRestore className="h-4 w-4 mr-1" /> Reativar</>
                ) : (
                  <><Archive className="h-4 w-4 mr-1" /> Arquivar</>
                )}
              </Button>
            </>
          )}
          <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        </div>
      </header>

      <ProductForm value={form} onChange={handleChange} errors={errors} />

      {dialog}
    </div>
  );
}
