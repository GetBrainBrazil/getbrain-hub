import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiFilter } from '@/components/crm/CrmFilters';
import { useCrmActors } from '@/hooks/crm/useCrmReference';
import type { DashboardFilters } from '@/hooks/crm/useCrmDashboardExec';

const PROJECT_TYPE_OPTS = [
  { value: 'whatsapp_chatbot', label: 'WhatsApp/Chatbot' },
  { value: 'ai_sdr', label: 'SDR com IA' },
  { value: 'sistema_gestao', label: 'Sistema de Gestão' },
  { value: 'automacao_processo', label: 'Automação' },
  { value: 'integracao_sistemas', label: 'Integração' },
  { value: 'outro', label: 'Outro' },
];

interface Props {
  filters: DashboardFilters;
  onChange: (next: Partial<DashboardFilters>) => void;
}

export function DashboardHeader({ filters, onChange }: Props) {
  const { data: actors = [] } = useCrmActors();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-bold font-display tracking-tight text-foreground sm:text-2xl">
          Dashboard CRM
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Visão executiva do funil — atualizado em tempo real
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={String(filters.periodDays)}
          onValueChange={(v) => onChange({ periodDays: Number(v) })}
        >
          <TabsList className="h-9">
            <TabsTrigger value="7" className="text-xs">7d</TabsTrigger>
            <TabsTrigger value="30" className="text-xs">30d</TabsTrigger>
            <TabsTrigger value="90" className="text-xs">90d</TabsTrigger>
          </TabsList>
        </Tabs>
        <MultiFilter
          label="Dono"
          selected={filters.ownerIds}
          onChange={(v) => onChange({ ownerIds: v })}
          options={actors.map((a) => ({ value: a.id, label: a.display_name }))}
        />
        <MultiFilter
          label="Tipo"
          selected={filters.projectTypes}
          onChange={(v) => onChange({ projectTypes: v })}
          options={PROJECT_TYPE_OPTS}
        />
      </div>
    </div>
  );
}
