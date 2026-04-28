import { Lock, Settings2, Tag, Users, Workflow, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadSourcesManager } from "@/components/crm/settings/LeadSourcesManager";
import { ContactRolesManager } from "@/components/crm/settings/ContactRolesManager";
import { useAuth } from "@/contexts/AuthContext";
import { usePersistedState } from "@/hooks/use-persisted-state";

export default function CrmSettings() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = usePersistedState("crm-settings-tab", "sources");

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-card/40 p-8 text-center">
        <Lock className="mx-auto mb-3 h-6 w-6 text-warning" />
        <h2 className="text-base font-semibold">Acesso restrito</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          As configurações do CRM controlam variáveis usadas em todo o módulo comercial e estão disponíveis somente para administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-accent" />
        <div>
          <h2 className="text-lg font-semibold font-display">Configurações do CRM</h2>
          <p className="text-xs text-muted-foreground">Personalize as variáveis usadas em todo o módulo comercial.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0 overflow-x-auto flex-nowrap whitespace-nowrap scrollbar-hide">
          <TabsTrigger value="sources" className="gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:font-semibold">
            <Tag className="h-4 w-4" /> Origens de leads
          </TabsTrigger>
          <TabsTrigger value="contact-roles" className="gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:font-semibold">
            <Users className="h-4 w-4" /> Papéis de contato
          </TabsTrigger>
          <TabsTrigger value="stages" disabled className="gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm">
            <Workflow className="h-4 w-4" /> Etapas
          </TabsTrigger>
          <TabsTrigger value="lost-reasons" disabled className="gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm">
            <XCircle className="h-4 w-4" /> Motivos de descarte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-5">
          <LeadSourcesManager canEdit={isAdmin} />
        </TabsContent>

        <TabsContent value="contact-roles" className="mt-5">
          <ContactRolesManager canEdit={isAdmin} />
        </TabsContent>

        <TabsContent value="stages" className="mt-5">
          <ComingSoon title="Etapas do funil" />
        </TabsContent>

        <TabsContent value="lost-reasons" className="mt-5">
          <ComingSoon title="Motivos de descarte" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">Em breve — você poderá configurar isso por aqui.</p>
    </div>
  );
}
