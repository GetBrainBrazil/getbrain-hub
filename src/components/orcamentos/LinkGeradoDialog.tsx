import { useState } from "react";
import { Copy, Check, ExternalLink, AlertTriangle } from "lucide-react";
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
import { buildPublicProposalUrl } from "@/lib/orcamentos/publicProposalUrl";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  expiresAt: string;
  /** Senha em plain text — só passada após geração inicial. Quando ausente,
   * o dialog mostra somente o link (modo "Ver link"). */
  password?: string | null;
}

export function LinkGeradoDialog({
  open,
  onOpenChange,
  accessToken,
  expiresAt,
  password,
}: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);
  const url = accessToken ? `${PUBLIC_BASE}/${accessToken}` : "";

  async function copyTo(text: string, setFlag: (b: boolean) => void, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      toast.success(`${label} copiado`);
      setTimeout(() => setFlag(false), 2000);
    } catch {
      toast.error("Não foi possível copiar — copie manualmente");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {password ? "Proposta enviada ✨" : "Link da proposta"}
          </DialogTitle>
          <DialogDescription>
            {password
              ? "Compartilhe o link e a senha com o cliente. Recomendamos enviar por canais separados (ex: link por email, senha por WhatsApp)."
              : "Compartilhe o link com o cliente. A senha não pode ser recuperada — use 'Redefinir senha' se necessário."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Link da proposta
            </label>
            <div className="flex gap-2">
              <Input value={url} readOnly className="font-mono text-xs" />
              <Button
                onClick={() => copyTo(url, setCopiedLink, "Link")}
                variant="outline"
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedLink ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>

          {password && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Senha de acesso
              </label>
              <div className="flex gap-2">
                <Input value={password} readOnly className="font-mono text-sm" />
                <Button
                  onClick={() => copyTo(password, setCopiedPwd, "Senha")}
                  variant="outline"
                >
                  {copiedPwd ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedPwd ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <div className="mt-2 flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Copie a senha agora.</strong> Por segurança, ela não pode
                  ser recuperada — apenas redefinida.
                </span>
              </div>
            </div>
          )}

          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1">
            <p>
              <span className="text-muted-foreground">Validade:</span>{" "}
              <strong>{expiresAt}</strong>
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
