import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  expiresAt: string;
}

const PUBLIC_BASE = "https://hub.getbrain.com.br/p";

export function LinkGeradoDialog({ open, onOpenChange, accessToken, expiresAt }: Props) {
  const [copied, setCopied] = useState(false);
  const url = accessToken ? `${PUBLIC_BASE}/${accessToken}` : "";

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar — copie manualmente");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Proposta enviada ✨</DialogTitle>
          <DialogDescription>
            Compartilhe o link abaixo com o cliente. Ele vai precisar da senha
            que você acabou de definir para abrir a proposta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={url} readOnly className="font-mono text-xs" />
            <Button onClick={handleCopy} variant="outline">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1">
            <p>
              <span className="text-muted-foreground">Validade:</span>{" "}
              <strong>{expiresAt}</strong>
            </p>
            <p className="text-muted-foreground">
              A página pública será publicada em uma próxima etapa. Por enquanto
              o link já fica reservado.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Abrir
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
