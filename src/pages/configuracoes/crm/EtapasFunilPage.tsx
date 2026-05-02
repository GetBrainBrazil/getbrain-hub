/**
 * Etapas do Funil — visão de configuração rica (read-mostly) dos 7 estágios
 * oficiais. Mostra ordem, label, probabilidade default e cor de cada estágio,
 * com explicações de uso e do comportamento legado (`gelado` → "Negociação",
 * `com_interesse` automático via proposta pública).
 *
 * Hoje os estágios são imutáveis (enum no banco + constantes em código). Esta
 * página é a fonte da verdade visível para o admin entender o que cada coluna
 * do Kanban significa, antes de uma futura migração para configuração dinâmica.
 */
import { Workflow, Info, Lock } from "lucide-react";
import {
  DEAL_STAGES,
  DEAL_STAGE_LABEL,
  DEAL_STAGE_PROBABILITY,
  DEAL_STAGE_DOT,
  DEAL_STAGE_TEXT,
} from "@/constants/dealStages";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STAGE_DESCRIPTION: Record<string, string> = {
  descoberta_marcada: "Lead novo, reunião de descoberta marcada na agenda.",
  descobrindo: "Reunião feita, levantando dor, contexto e potencial de fechamento.",
  proposta_na_mesa: "Lead qualificado, proposta sendo elaborada/redigida.",
  ajustando: "Proposta enviada para o cliente, aguardando feedback ou ajustes.",
  gelado: "Negociação ativa de valores e escopo com o cliente.",
  com_interesse: "Cliente clicou em \"Quero avançar\" na proposta pública (move automático).",
  ganho: "Deal fechado e convertido em projeto.",
  perdido: "Deal descartado — registrar motivo no funil.",
};

export default function EtapasFunilPage() {
  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <Workflow className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold font-display">Etapas do funil</h2>
          <p className="text-xs text-muted-foreground">
            Os 7 estágios oficiais do funil comercial. Eles definem as colunas do Kanban e a probabilidade default usada nos cálculos do dashboard.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-[10px]">
          <Lock className="h-3 w-3" /> Imutável
        </Badge>
      </header>

      <Card className="border-accent/20 bg-accent/5 p-4 flex gap-3">
        <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          A estrutura do funil é fixa nesta versão para garantir consistência entre Kanban, Dashboard e regras de conversão Lead→Deal. A edição livre de etapas será habilitada quando o sistema migrar para um modelo de funil dinâmico.
        </div>
      </Card>

      <div className="space-y-2">
        {DEAL_STAGES.map((stage, idx) => (
          <Card key={stage} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3 min-w-[200px]">
              <span className="text-xs font-mono text-muted-foreground w-5 text-right">{String(idx + 1).padStart(2, "0")}</span>
              <span className={`h-2.5 w-2.5 rounded-full ${DEAL_STAGE_DOT[stage]}`} />
              <span className={`font-semibold text-sm ${DEAL_STAGE_TEXT[stage]}`}>
                {DEAL_STAGE_LABEL[stage]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex-1">{STAGE_DESCRIPTION[stage]}</p>
            <Badge variant="outline" className="font-mono shrink-0">
              {DEAL_STAGE_PROBABILITY[stage]}%
            </Badge>
            <code className="text-[10px] text-muted-foreground/60 font-mono shrink-0 hidden md:inline">
              {stage}
            </code>
          </Card>
        ))}
      </div>
    </div>
  );
}
