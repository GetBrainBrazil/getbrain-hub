import { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewLeadDialog } from '@/components/crm/NewLeadDialog';
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
  const TABS = useMemo(() => ALL_TABS.filter((t) => !t.adminOnly || isAdmin), [isAdmin]);
  const currentTab = TABS.find((t) => location.pathname.startsWith(`/crm/${t.value}`))?.value ?? 'pipeline';
  const showNewLead = SHOW_NEW_LEAD.has(currentTab);

  return (
    <div className="mx-auto max-w-[1800px] space-y-4 sm:space-y-5 px-1 pb-12 animate-fade-in">
      <header className="space-y-3">
        {/* Title + actions */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground">CRM</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Funil comercial e relacionamento com clientes</p>
          </div>
          {showNewLead && (
            <Button
              size="sm"
              onClick={() => setLeadOpen(true)}
              className="h-9 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" /> Novo Lead
            </Button>
          )}
        </div>

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
