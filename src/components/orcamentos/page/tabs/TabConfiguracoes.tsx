/**
 * Tab "Configurações" — opções da proposta:
 *  - Template visual (PDF + página)
 *  - Validade (atalho)
 *  - Motivo da recusa (quando aplicável)
 *  - Zona de perigo (excluir)
 */
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { listTemplates } from "@/lib/orcamentos/templates";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";

interface Props {
  proposal: ProposalDetail;
  state: {
    templateKey: string;
    validUntil: string;
  };
  setField: (field: any, value: any) => void;
  onUpdateField: (field: string, value: any) => void;
  onDelete: () => void;
}

export function TabConfiguracoes({
  proposal,
  state,
  setField,
  onUpdateField,
  onDelete,
}: Props) {
  return (
    <div className="space-y-4 max-w-3xl">
      {/* Template */}
      <Card className="p-4 space-y-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Template visual
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Define o estilo do PDF e da página pública.
          </p>
        </div>
        <Select
          value={state.templateKey}
          onValueChange={(v) => setField("templateKey", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {listTemplates().map((t) => (
              <SelectItem key={t.key} value={t.key}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Validade */}
      <Card className="p-4 space-y-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Validade
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Após esta data, o link público expira automaticamente.
          </p>
        </div>
        <div className="max-w-xs">
          <Label className="text-[11px] text-muted-foreground">Validade da proposta</Label>
          <Input
            type="date"
            value={state.validUntil}
            onChange={(e) => setField("validUntil", e.target.value)}
            className="h-9 mt-1"
          />
        </div>
      </Card>

      {/* Motivo da recusa */}
      {proposal.status === "recusada" && (
        <Card className="p-4 space-y-3 border-destructive/30">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-destructive">
            Motivo da recusa
          </h3>
          <Textarea
            defaultValue={proposal.rejection_reason || ""}
            onBlur={(e) => onUpdateField("rejection_reason", e.target.value || null)}
            placeholder="Ex: cliente escolheu concorrente"
            rows={4}
            className="resize-none"
          />
        </Card>
      )}

      {/* Zona de perigo */}
      <Card className="p-4 space-y-3 border-destructive/30 bg-destructive/5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-destructive">
            Zona de perigo
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Excluir esta proposta a remove da listagem e do CRM. A operação é reversível
            via restauração no banco — mas evite usar em propostas ativas.
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={onDelete} className="h-8">
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Excluir proposta
        </Button>
      </Card>
    </div>
  );
}
