/**
 * Painel "Esta proposta": Escopo (módulos / itens).
 *
 * Editor compacto: descrição rápida e valor por linha. Para
 * reordenar/abrir descrições longas/dependências, manda pra aba Escopo.
 */
import { PainelHeader, Campo } from "./ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { formatBRL, type ScopeItem } from "@/lib/orcamentos/calculateTotal";
import type { PainelPropostaProps } from "./types";

interface Props extends PainelPropostaProps {
  setItems: (items: ScopeItem[]) => void;
  onOpenFullEditor?: () => void;
}

export function PainelEscopoItens({ state, setItems, onOpenFullEditor }: Props) {
  const items: ScopeItem[] = state.scopeItems || [];
  const total = items.reduce((s, it) => s + (Number(it.value) || 0), 0);

  const update = (i: number, patch: Partial<ScopeItem>) => {
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const add = () => setItems([...items, { title: "Novo módulo", description: "", value: 0 }]);

  return (
    <div>
      <PainelHeader
        icon="LayoutGrid"
        title="Escopo (módulos)"
        description="Lista de módulos / entregáveis exibida na seção Escopo."
        action={
          onOpenFullEditor && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onOpenFullEditor}>
              <ExternalLink className="h-3.5 w-3.5" />
              Editor completo
            </Button>
          )
        }
      />

      <Campo
        label="Módulos"
        count={items.length}
        hint='Para descrições longas, dependências e critérios, use o "Editor completo" (aba Escopo).'
      >
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_140px_36px] gap-2 items-center">
              <Input
                value={it.title}
                onChange={(e) => update(i, { title: e.target.value })}
                placeholder="Nome do módulo"
                className="h-9 text-sm"
              />
              <Input
                type="number"
                step="0.01"
                value={it.value || ""}
                onChange={(e) => update(i, { value: Number(e.target.value) || 0 })}
                placeholder="0,00"
                className="h-9 text-sm font-mono"
              />
              <Button
                size="icon" variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
                title="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={add}
            className="h-9 w-full border-dashed text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Adicionar módulo
          </Button>

          {items.length > 0 && (
            <div className="flex items-center justify-end pt-2 border-t border-border text-xs">
              <span className="text-muted-foreground mr-2">Soma dos itens:</span>
              <span className="font-mono font-semibold">{formatBRL(total)}</span>
            </div>
          )}
        </div>
      </Campo>
    </div>
  );
}
