/**
 * Tab "Conteúdo IA" — campos de texto longo da proposta (boas-vindas, resumo
 * executivo, contexto/dor, visão da solução). Inclui o dropdown de geração
 * automática via IA.
 */
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GerarComIaDropdown } from "@/components/orcamentos/GerarComIaDropdown";
import type { GenerationType } from "@/lib/orcamentos/generateContent";

interface Props {
  proposalId: string;
  hasDealLink: boolean;
  isLocked: boolean;
  state: {
    welcomeMessage: string;
    executiveSummary: string;
    painContext: string;
    solutionOverview: string;
  };
  setField: (field: any, value: any) => void;
  dealPainDescription?: string | null;
  onAiGenerated: (type: GenerationType, content: any) => void;
}

export function TabConteudoIA({
  proposalId,
  hasDealLink,
  isLocked,
  state,
  setField,
  dealPainDescription,
  onAiGenerated,
}: Props) {
  return (
    <div className="space-y-4 max-w-3xl">
      {/* Barra com gerador IA */}
      <Card className="p-3 flex items-center justify-between gap-3 flex-wrap bg-accent/5 border-accent/20">
        <div>
          <p className="text-xs font-semibold text-foreground">Geração assistida por IA</p>
          <p className="text-[11px] text-muted-foreground">
            Use os blocos de conteúdo abaixo. A IA preenche com base no contexto do
            deal e da proposta.
          </p>
        </div>
        <GerarComIaDropdown
          proposalId={proposalId}
          hasDealLink={hasDealLink}
          onGenerated={onAiGenerated}
          disabled={isLocked}
        />
      </Card>

      {/* Boas-vindas */}
      <Card className="p-4 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Boas-vindas
        </h3>
        <Textarea
          value={state.welcomeMessage}
          onChange={(e) => setField("welcomeMessage", e.target.value)}
          rows={3}
          placeholder="Olá! Esta é a proposta preparada especialmente para…"
          className="text-base leading-relaxed italic resize-none"
        />
      </Card>

      {/* Resumo executivo */}
      <Card className="p-4 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Resumo executivo
        </h3>
        <Textarea
          value={state.executiveSummary}
          onChange={(e) => setField("executiveSummary", e.target.value)}
          rows={6}
          placeholder="3-4 parágrafos descrevendo a proposta em alto nível."
          className="text-base leading-relaxed resize-none"
        />
      </Card>

      {/* Contexto / dor */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contexto e dor
          </h3>
          {dealPainDescription && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[11px]"
              onClick={() => setField("painContext", dealPainDescription)}
            >
              Importar do deal
            </Button>
          )}
        </div>
        <Textarea
          value={state.painContext}
          onChange={(e) => setField("painContext", e.target.value)}
          rows={5}
          placeholder="O que o cliente está enfrentando hoje."
          className="text-base leading-relaxed resize-none"
        />
      </Card>

      {/* Visão geral da solução */}
      <Card className="p-4 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Visão geral da solução
        </h3>
        <Textarea
          value={state.solutionOverview}
          onChange={(e) => setField("solutionOverview", e.target.value)}
          rows={5}
          placeholder="A solução em alto nível. Os módulos detalhados ficam em cada item do escopo."
          className="text-base leading-relaxed resize-none"
        />
      </Card>
    </div>
  );
}
