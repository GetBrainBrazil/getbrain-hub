/**
 * /projetos/:id/suporte
 *
 * Estrutura espelhada — módulo Suporte ainda não plugado: dados zerados +
 * banner "em breve" (princípio 2.15: nenhum mock).
 */
import { useParams } from "react-router-dom";
import { Headphones, AlertTriangle, Clock, BarChart3, History } from "lucide-react";
import { useProjetoHeader } from "@/hooks/projetos/useProjetoHeader";
import { useProjectMetrics } from "@/hooks/useProjectMetrics";
import {
  ProjetoDetalheHeader,
  type MiniKpi,
} from "@/components/projetos/detalhe/ProjetoDetalheHeader";
import {
  DetalheBloco,
  ComingSoonBlock,
} from "@/components/projetos/detalhe/DetalheBloco";

export default function ProjetoSuporteDetalhe() {
  const { id: projectId = "" } = useParams<{ id: string }>();
  const { data: header } = useProjetoHeader(projectId);
  const { data: m } = useProjectMetrics(projectId);

  const kpis: MiniKpi[] = [
    { label: "Tickets abertos", value: m?.tickets_open ?? 0 },
    { label: "Resolvidos (30d)", value: m?.tickets_resolved_30d ?? 0 },
    {
      label: "Tempo médio",
      value: m?.avg_resolution_hours ? `${m.avg_resolution_hours.toFixed(1)}h` : "—",
    },
    { label: "SLA", value: "—", tone: "muted" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <ProjetoDetalheHeader
        projectId={projectId}
        projectCode={header?.code}
        projectName={header?.name}
        companyName={header?.company_name}
        title="Visão de Suporte"
        subtitle="Tickets, SLA e qualidade do atendimento"
        kpis={kpis}
      />

      <DetalheBloco icon={AlertTriangle} title="Tickets abertos">
        <ComingSoonBlock message="Módulo Suporte em breve. Aqui você verá a lista de tickets abertos com prioridade, idade, responsável e SLA." />
      </DetalheBloco>

      <DetalheBloco icon={Clock} title="SLA & tempo de resposta">
        <ComingSoonBlock message="Acompanhamento de SLA por categoria de ticket, tempo médio de primeira resposta e tempo médio de resolução." />
      </DetalheBloco>

      <DetalheBloco icon={BarChart3} title="Top categorias de problema">
        <ComingSoonBlock message="Categorias mais frequentes de chamados deste projeto, para identificar pontos de atrito recorrentes." />
      </DetalheBloco>

      <DetalheBloco icon={History} title="Histórico de atendimento">
        <ComingSoonBlock message="Linha do tempo dos tickets resolvidos, com tempo de resolução e satisfação do cliente." />
      </DetalheBloco>
    </div>
  );
}
