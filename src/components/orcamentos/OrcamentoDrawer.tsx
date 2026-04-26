import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, Loader2 } from "lucide-react";
import { useProposalDetail } from "@/hooks/orcamentos/useProposalDetail";
import { OrcamentoStatusBadge } from "./OrcamentoStatusBadge";
import { AbaResumo } from "./abas/AbaResumo";
import { AbaVersoes } from "./abas/AbaVersoes";
import { AbaHistorico } from "./abas/AbaHistorico";
import { AbaDetalhes } from "./abas/AbaDetalhes";
import { effectiveStatus } from "@/lib/orcamentos/calculateTotal";
import { getTemplate } from "@/lib/orcamentos/templates";
import { toast } from "sonner";

interface Props {
  proposalId: string | null;
  onClose: () => void;
}

export function OrcamentoDrawer({ proposalId, onClose }: Props) {
  const navigate = useNavigate();
  const { data, isLoading } = useProposalDetail(proposalId || undefined);

  const open = !!proposalId;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[40vw] sm:min-w-[480px] overflow-y-auto p-0"
      >
        {isLoading || !data ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Carregando…
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-3 border-b border-border p-5 sticky top-0 bg-background/95 backdrop-blur z-10">
              <div>
                <SheetTitle className="flex items-center gap-2 flex-wrap text-base">
                  <span className="font-mono">{data.code}</span>
                  <span className="text-muted-foreground">—</span>
                  <span>{data.client_company_name}</span>
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 flex-wrap text-xs mt-1.5">
                  <OrcamentoStatusBadge
                    status={effectiveStatus(data.status, data.valid_until)}
                  />
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    Template: {getTemplate(data.template_key).label}
                  </span>
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    navigate(`/financeiro/orcamentos/${data.id}/editar`)
                  }
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir editor
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (data.pdf_url) {
                      window.open(data.pdf_url, "_blank");
                    } else {
                      toast.info("Nenhuma versão gerada ainda. Use o editor pra gerar a primeira.");
                    }
                  }}
                  disabled={!data.pdf_url}
                >
                  <Download className="h-3.5 w-3.5" /> Baixar última versão
                </Button>
              </div>
            </SheetHeader>

            <div className="p-5">
              <Tabs defaultValue="resumo">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="resumo">Resumo</TabsTrigger>
                  <TabsTrigger value="versoes">Versões</TabsTrigger>
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                  <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                </TabsList>
                <TabsContent value="resumo" className="mt-4">
                  <AbaResumo proposal={data} />
                </TabsContent>
                <TabsContent value="versoes" className="mt-4">
                  <AbaVersoes proposalId={data.id} />
                </TabsContent>
                <TabsContent value="historico" className="mt-4">
                  <AbaHistorico />
                </TabsContent>
                <TabsContent value="detalhes" className="mt-4">
                  <AbaDetalhes proposal={data} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
