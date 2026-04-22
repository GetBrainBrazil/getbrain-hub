import { Link } from "react-router-dom";
import { Headphones, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Suporte() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
        <Headphones className="h-7 w-7 text-accent" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Módulo Suporte</h1>
        <p className="text-sm text-muted-foreground">
          Em desenvolvimento. Tickets de suporte por projeto, SLA, tempo médio
          de resolução e histórico de atendimentos viverão aqui.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao início
        </Link>
      </Button>
    </div>
  );
}
