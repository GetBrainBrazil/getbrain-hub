import { Building2, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { LeadsView } from './leads/LeadsView';
import { CompaniesView } from './leads/CompaniesView';

export default function CrmLeadsAndCompanies() {
  const [tab, setTab] = usePersistedState<'leads' | 'empresas'>('crm-hub-tab', 'leads');
  return (
    <div className="space-y-4 sm:space-y-5">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'leads' | 'empresas')}>
        <TabsList className="h-10 w-full sm:w-auto rounded-full bg-muted/40 p-1">
          <TabsTrigger
            value="leads"
            className="flex-1 sm:flex-none gap-1.5 rounded-full data-[state=active]:bg-card data-[state=active]:text-accent"
          >
            <Users className="h-4 w-4" /> Leads
          </TabsTrigger>
          <TabsTrigger
            value="empresas"
            className="flex-1 sm:flex-none gap-1.5 rounded-full data-[state=active]:bg-card data-[state=active]:text-accent"
          >
            <Building2 className="h-4 w-4" /> Empresas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="leads" className="mt-4 sm:mt-5 focus-visible:outline-none">
          <LeadsView />
        </TabsContent>
        <TabsContent value="empresas" className="mt-4 sm:mt-5 focus-visible:outline-none">
          <CompaniesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
