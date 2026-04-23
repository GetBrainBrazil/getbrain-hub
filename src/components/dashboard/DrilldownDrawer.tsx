/**
 * DrilldownDrawer — drawer lateral acionado por alerts/KPIs.
 * Mostra lista de tasks com clique → /dev/tasks/:code.
 */
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrilldownTask {
  id: string;
  code: string;
  title: string;
  status?: string;
  type?: string;
  priority?: string;
  meta?: string; // texto contextual (ex: "bloqueada há 3d")
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  tasks: DrilldownTask[];
}

export function DrilldownDrawer({ open, onOpenChange, title, description, tasks }: Props) {
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <ScrollArea className="-mx-6 mt-4 h-[calc(100vh-150px)] px-6">
          {tasks.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma task neste recorte.
            </p>
          ) : (
            <ul className="space-y-1">
              {tasks.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/dev/tasks/${t.code}`);
                    }}
                    className={cn(
                      "group flex w-full items-start justify-between gap-2 rounded-md border border-transparent px-2.5 py-2 text-left transition-colors",
                      "hover:border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {t.code}
                        </span>
                        {t.priority && t.priority !== "medium" && (
                          <Badge variant="outline" className="h-4 px-1 text-[9px]">
                            {t.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-tight">
                        {t.title}
                      </p>
                      {t.meta && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {t.meta}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="mt-1 h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
