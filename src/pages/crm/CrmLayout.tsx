import { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MultiFilter, SearchBox, ValueRangeFilter } from '@/components/crm/CrmFilters';
import { NewLeadDialog } from '@/components/crm/NewLeadDialog';
import { useCrmActors, useDistinctLeadSources } from '@/hooks/crm/useCrmReference';
import { useCrmHubStore } from '@/hooks/useCrmHubStore';
import { useAuth } from '@/contexts/AuthContext';

const ALL_TABS = [
  { value: 'dashboard', label: 'Dashboard', adminOnly: false },
  { value: 'pipeline', label: 'Pipeline', adminOnly: false },
  { value: 'leads', label: 'Leads & Empresas', adminOnly: false },
  { value: 'calendario', label: 'Calendário', adminOnly: false },
  { value: 'configuracoes', label: 'Configurações', adminOnly: true },
];

// Botão "Novo Lead" só aparece em "Leads & Empresas".
// No Pipeline, a criação acontece via "+ Novo Deal" dentro da própria página.
const SHOW_NEW_LEAD = new Set(['leads']);

export default function CrmLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [leadOpen, setLeadOpen] = useState(false);
  const { data: actors = [] } = useCrmActors();
  const { data: sources = [] } = useDistinctLeadSources();
  const store = useCrmHubStore();
  const TABS = useMemo(() => ALL_TABS.filter((t) => !t.adminOnly || isAdmin), [isAdmin]);
  const currentTab = TABS.find((t) => location.pathname.startsWith(`/crm/${t.value}`))?.value ?? 'pipeline';
  const showNewLead = SHOW_NEW_LEAD.has(currentTab);
  const hasActions = showNewLead;

  const filterControls = (
    <>
      <MultiFilter
        label="Dono"
        selected={store.ownerFilter}
        onChange={store.setOwnerFilter}
        options={actors.map((a) => ({ value: a.id, label: a.display_name }))}
      />
      <MultiFilter
        label="Origem"
        selected={store.sourceFilter}
        onChange={store.setSourceFilter}
        options={[{ value: 'direto', label: 'Direto' }, ...sources.map((s) => ({ value: s, label: s }))]}
      />
      <ValueRangeFilter value={store.valueRange} onChange={store.setValueRange} />
    </>
  );

  return (
    <div className="mx-auto max-w-[1800px] space-y-4 sm:space-y-6 px-1 pb-12 animate-fade-in">
      <header className="space-y-3 sm:space-y-4">
        {/* Title + actions */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground">CRM</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Funil comercial e relacionamento com clientes</p>
          </div>
          {hasActions && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {showNewLead && (
                <Button variant="outline" size="sm" onClick={() => setLeadOpen(true)} className="flex-1 sm:flex-none min-h-10 sm:min-h-9">
                  <Plus className="h-4 w-4" /> <span className="hidden xs:inline">Novo </span>Lead
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Filters bar — apenas no Pipeline */}
        {currentTab === 'pipeline' && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 p-2 sm:p-3">
            <div className="flex-1 min-w-0">
              <SearchBox value={store.search} onChange={store.setSearch} placeholder="Buscar no CRM..." />
            </div>

            {/* Mobile: Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden h-10 gap-1 shrink-0">
                  <SlidersHorizontal className="h-4 w-4" /> Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
                <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
                <div className="mt-4 flex flex-wrap gap-2">
                  {filterControls}
                </div>
                <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={store.resetFilters}>
                  Limpar filtros
                </Button>
              </SheetContent>
            </Sheet>

            {/* Desktop: inline */}
            <div className="hidden md:flex items-center gap-2 flex-wrap">
              {filterControls}
              <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={store.resetFilters}>
                Limpar
              </Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={(v) => navigate(`/crm/${v}`)}>
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0 overflow-x-auto flex-nowrap whitespace-nowrap scrollbar-hide">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-none border-b-2 border-transparent bg-transparent px-3 sm:px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <Outlet />

      <NewLeadDialog open={leadOpen} onOpenChange={setLeadOpen} />
    </div>
  );
}
