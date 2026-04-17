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

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  variant = "destructive",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const isDestructive = variant === "destructive";

  async function handleConfirm(e: React.MouseEvent) {
    e.preventDefault();
    await onConfirm();
    onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[420px] rounded-xl p-6 gap-0">
        <AlertDialogHeader className="items-center text-center sm:text-center space-y-3">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              isDestructive ? "bg-red-100 dark:bg-red-500/15" : "bg-primary/10",
            )}
          >
            <AlertTriangle
              className={cn(
                "h-6 w-6",
                isDestructive ? "text-red-500" : "text-primary",
              )}
            />
          </div>
          <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          <AlertDialogCancel disabled={loading} className="mt-0 flex-1">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "flex-1",
              isDestructive &&
                "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500",
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
    />
  );

  return { confirm, dialog };
}
