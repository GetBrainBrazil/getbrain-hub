import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type Variant = "destructive" | "default";

interface ConfirmState {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
}

/**
 * Hook imperativo para abrir o ConfirmDialog em qualquer lugar.
 *
 * Uso:
 *   const { confirm, dialog } = useConfirm();
 *   ...
 *   if (await confirm({ title, description })) { ...delete... }
 *   ...
 *   return <>{...} {dialog}</>;
 */
export function useConfirm() {
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<ConfirmState>({ title: "" });
  const resolverRef = React.useRef<((v: boolean) => void) | null>(null);
  const isDestructive = state.variant !== "default";

  const confirm = React.useCallback((opts: ConfirmState) => {
    setState(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v && resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  const handleConfirm = () => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  const dialog = (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-[420px] rounded-xl p-6 gap-0">
        <AlertDialogHeader className="items-center text-center sm:text-center space-y-3">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              isDestructive ? "bg-destructive/10" : "bg-primary/10",
            )}
          >
            <AlertTriangle
              className={cn(
                "h-6 w-6",
                isDestructive ? "text-destructive" : "text-primary",
              )}
            />
          </div>
          <AlertDialogTitle className="text-lg font-semibold">{state.title}</AlertDialogTitle>
          {state.description ? (
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {state.description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          <AlertDialogCancel className="mt-0 flex-1">
            {state.cancelLabel ?? "Cancelar"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
              handleOpenChange(false);
            }}
            className={cn(
              "flex-1",
              isDestructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {state.confirmLabel ?? "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
