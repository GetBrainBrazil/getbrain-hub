import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Orcamento() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Proposta</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold mb-2">Módulo em desenvolvimento</h3>
          <p className="text-muted-foreground max-w-md">O módulo de orçamento será implementado em breve. Aqui você poderá definir metas por categoria e acompanhar a execução mês a mês.</p>
        </CardContent>
      </Card>
    </div>
  );
}
