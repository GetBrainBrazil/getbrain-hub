import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiFilter, SearchBox, ValueRangeFilter } from '@/components/crm/CrmFilters';
import { NewDealDialog } from '@/components/crm/NewDealDialog';
import { NewLeadDialog } from '@/components/crm/NewLeadDialog';
import { useCrmActors, useDistinctLeadSources } from '@/hooks/crm/useCrmReference';
import { useCrmHubStore } from '@/hooks/useCrmHubStore';

const TABS = [{ value: 'dashboard', label: 'Dashboard' }, { value: 'pipeline', label: 'Pipeline' }, { value: 'leads', label: 'Leads' }, { value: 'empresas', label: 'Empresas' }, { value: 'calendario', label: 'Calendário' }];
export default function CrmLayout() {
  const navigate = useNavigate(); const location = useLocation();
  const [leadOpen, setLeadOpen] = useState(false); const [dealOpen, setDealOpen] = useState(false);
  const { data: actors = [] } = useCrmActors(); const { data: sources = [] } = useDistinctLeadSources();
  const store = useCrmHubStore();
  const currentTab = TABS.find((t) => location.pathname.startsWith(`/crm/${t.value}`))?.value ?? 'pipeline';
  return <div className="mx-auto max-w-[1800px] space-y-6 px-1 pb-12 animate-fade-in"><header className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold font-display tracking-tight text-foreground">CRM</h1><p className="text-sm text-muted-foreground">Funil comercial e relacionamento com clientes</p></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setLeadOpen(true)}><Plus className="h-4 w-4" /> Novo Lead</Button><Button size="sm" onClick={() => setDealOpen(true)}><Plus className="h-4 w-4" /> Novo Deal</Button></div></div><div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/50 p-3"><MultiFilter label="Dono" selected={store.ownerFilter} onChange={store.setOwnerFilter} options={actors.map((a) => ({ value: a.id, label: a.display_name }))} /><MultiFilter label="Origem" selected={store.sourceFilter} onChange={store.setSourceFilter} options={[{ value: 'direto', label: 'Direto' }, ...sources.map((s) => ({ value: s, label: s }))]} /><ValueRangeFilter value={store.valueRange} onChange={store.setValueRange} /><SearchBox value={store.search} onChange={store.setSearch} placeholder="Buscar no CRM..." /><Button variant="ghost" size="sm" className="ml-auto h-9 text-xs" onClick={store.resetFilters}>Limpar</Button></div><Tabs value={currentTab} onValueChange={(v) => navigate(`/crm/${v}`)}><TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">{TABS.map((t) => <TabsTrigger key={t.value} value={t.value} className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none">{t.label}</TabsTrigger>)}</TabsList></Tabs></header><Outlet /><NewLeadDialog open={leadOpen} onOpenChange={setLeadOpen} /><NewDealDialog open={dealOpen} onOpenChange={setDealOpen} /></div>;
}
