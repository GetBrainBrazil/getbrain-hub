import { Card, CardContent } from "@/components/ui/card";

export default function Relatorios() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-4">📑</div>
          <h3 className="text-lg font-semibold mb-2">Relatórios em desenvolvimento</h3>
          <p className="text-muted-foreground max-w-md">Em breve: DRE, Fluxo de Caixa, Análise de Inadimplência, e muito mais.</p>
        </CardContent>
      </Card>
    </div>
  );
}
