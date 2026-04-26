import { Card } from "@/components/ui/card";
import { History } from "lucide-react";

export function AbaHistorico() {
  return (
    <Card className="p-6 text-center border-dashed space-y-2">
      <History className="h-8 w-8 text-muted-foreground/40 mx-auto" />
      <p className="text-sm text-muted-foreground">
        Histórico de mudanças será exibido após implementação completa do
        módulo de auditoria{" "}
        <span className="font-mono text-xs">(DT-09C1A-1)</span>.
      </p>
    </Card>
  );
}
