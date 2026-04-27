import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewAs } from "@/hooks/useViewAs";

export function ViewAsBanner() {
  const { mode, clear } = useViewAs();
  if (mode.kind === "none") return null;

  const label =
    mode.kind === "cargo"
      ? `Visualizando como cargo: ${mode.cargoNome}`
      : `Visualizando como ${mode.userNome}${mode.cargoNome ? ` — ${mode.cargoNome}` : ""}`;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/40 text-amber-900 dark:text-amber-200 px-3 sm:px-4 py-2 flex items-center gap-2 text-xs sm:text-sm">
      <Eye className="h-4 w-4 shrink-0" />
      <span className="truncate flex-1">{label}</span>
      <Button size="sm" variant="ghost" onClick={clear} className="h-7 gap-1 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20">
        <X className="h-3.5 w-3.5" /> Sair
      </Button>
    </div>
  );
}
