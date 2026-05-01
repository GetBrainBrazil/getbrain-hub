import { useState } from "react";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { setProposalPassword } from "@/lib/orcamentos/proposalPassword";
import { toast } from "sonner";

interface Props {
  proposalId: string;
  proposalCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RedefinirSenhaDialog({
  proposalId,
  proposalCode,
  open,
  onOpenChange,
}: Props) {
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (password.length < 4) {
      toast.error("Senha precisa ter ao menos 4 caracteres");
      return;
    }
    setSubmitting(true);
    try {
      await setProposalPassword({ proposalId, plainPassword: password });
      toast.success("Senha redefinida com sucesso");
      onOpenChange(false);
      setPassword("");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao redefinir senha");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir senha de {proposalCode}</DialogTitle>
          <DialogDescription>
            A senha antiga será descartada. Compartilhe a nova senha com o
            cliente fora deste sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="prop-new-password">Nova senha *</Label>
          <div className="relative">
            <Input
              id="prop-new-password"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              minLength={4}
              autoFocus
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={() => setShowPwd((v) => !v)}
            >
              {showPwd ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || password.length < 4}>
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" />
            )}
            Redefinir senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
