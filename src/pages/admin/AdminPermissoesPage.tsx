import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useCargos, useAllCargoPermissoes, MODULOS, Cargo } from "@/hooks/useCargos";
import { CargoDialog } from "@/components/configuracoes/CargoDialog";
import { cn } from "@/lib/utils";

export default function AdminPermissoesPage() {
  const { data: cargos = [] } = useCargos();
  const { data: perms = [] } = useAllCargoPermissoes();
  const [editing, setEditing] = useState<Cargo | null>(null);
  const [open, setOpen] = useState(false);

  const matrix = useMemo(() => {
    // map cargoId -> Set("modulo")
    const m = new Map<string, Set<string>>();
    perms.forEach(p => {
      if (!m.has(p.cargo_id)) m.set(p.cargo_id, new Set());
      m.get(p.cargo_id)!.add(p.modulo);
    });
    return m;
  }, [perms]);

  const ordered = [...cargos].sort((a, b) => b.nivel - a.nivel);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5 border-b">
          <div className="font-semibold">Matriz de Permissões</div>
          <p className="text-sm text-muted-foreground">Controle de acesso por página.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Página</th>
                {ordered.map(c => (
                  <th key={c.id} className="px-4 py-3 font-medium text-muted-foreground text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <span className="w-2 h-2 rounded-full" style={{ background: c.cor }} />
                      <span className="truncate">{c.nome}</span>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {MODULOS.map(mod => (
                <tr key={mod.key} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{mod.label}</td>
                  {ordered.map(c => {
                    const has = matrix.get(c.id)?.has(mod.key);
                    return (
                      <td key={c.id} className="px-4 py-3 text-center">
                        {has ? <Check className="h-4 w-4 mx-auto text-success" /> : <span className="text-muted-foreground/50">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right">
                    <Button variant="link" size="sm" className="h-auto p-0 text-accent" onClick={() => {
                      // Edita permissões de todos os cargos para a página: abrir o primeiro cargo como atalho
                      if (ordered[0]) { setEditing(ordered[0]); setOpen(true); }
                    }}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cards resumo por cargo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ordered.map(c => {
          const set = matrix.get(c.id) ?? new Set<string>();
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.cor }} />
                  {c.nome}
                </div>
                <Badge variant="outline" className="text-xs">{set.size}/{MODULOS.length}</Badge>
              </div>
              <ul className="space-y-1 text-sm">
                {MODULOS.map(m => {
                  const has = set.has(m.key);
                  return (
                    <li key={m.key} className={cn("flex items-center gap-2", has ? "text-foreground" : "text-muted-foreground/40")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", has ? "bg-primary" : "bg-muted-foreground/30")} />
                      {m.label}
                    </li>
                  );
                })}
              </ul>
              <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => { setEditing(c); setOpen(true); }}>
                Editar permissões
              </Button>
            </Card>
          );
        })}
      </div>

      <CargoDialog open={open} onOpenChange={setOpen} cargo={editing} />
    </div>
  );
}
