import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ConfirmDialog";

interface Props {
  /** Tipo da entidade no singular: "deal", "lead", "empresa", etc. */
  entityLabel: string;
  /** Nome humano da entidade — mostrado no título do confirm. */
  entityName: string;
  /** Texto extra de aviso (ex.: "Atividades, dependências e propostas vinculadas serão removidas em cascata."). */
  cascadeWarning?: string;
  /** Função assíncrona que executa o hard delete. */
  onDelete: () => Promise<void> | void;
  disabled?: boolean;
}

/**
 * Zona de risco padronizada para páginas de detalhe (CRM e demais módulos).
 *
 * Renderiza um card destacado em vermelho com o botão de exclusão definitiva.
 * Usa o `useConfirm` global do projeto — nunca o `confirm()` nativo.
 */
export function DangerZone({ entityLabel, entityName, cascadeWarning, onDelete, disabled }: Props) {
  const { confirm, dialog } = useConfirm();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const ok = await confirm({
      title: `Excluir ${entityLabel} "${entityName}"?`,
      description: (
        <>
          Esta ação <strong>não pode ser desfeita</strong>. O registro será removido
          permanentemente do banco de dados.
          {cascadeWarning && (
            <>
              <br />
              <br />
              {cascadeWarning}
            </>
          )}
        </>
      ),
      confirmLabel: "Excluir definitivamente",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      setLoading(true);
      await onDelete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="mt-8 border-destructive/40 bg-destructive/5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="font-semibold text-destructive">Zona de risco</div>
            <p className="text-sm text-muted-foreground">
              Excluir esta {entityLabel} remove permanentemente o registro e todo o
              processo associado. Esta ação é irreversível.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground sm:w-auto"
            disabled={disabled || loading}
            onClick={handleClick}
          >
            <Trash2 className="h-4 w-4" />
            {loading ? "Excluindo..." : `Excluir ${entityLabel}`}
          </Button>
        </div>
      </Card>
      {dialog}
    </>
  );
}
