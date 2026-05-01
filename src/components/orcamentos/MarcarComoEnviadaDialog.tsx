import { useState } from "react";
import { Eye, EyeOff, Loader2, Send } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  proposalId: string;
  proposalCode: string;
  expiresAt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Disparado depois da proposta ser marcada como enviada com sucesso.
   * Inclui a senha em plain text para exibir UMA ÚNICA VEZ ao Daniel. */
  onSent: (info: { accessToken: string; expiresAt: string; password: string }) => void;
}

export function MarcarComoEnviadaDialog({
  proposalId,
  proposalCode,
  expiresAt,
  open,
  onOpenChange,
  onSent,
}: Props) {
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [validade, setValidade] = useState(expiresAt);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (password.length < 4) {
      toast.error("Senha precisa ter ao menos 4 caracteres");
      return;
    }
    if (!validade) {
      toast.error("Defina a data de validade");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Grava hash de senha (RPC SECURITY DEFINER)
      const setPwd = await supabase.rpc("set_proposal_password" as any, {
        _proposal_id: proposalId,
        _plain_password: password,
      });
      if (setPwd.error) throw setPwd.error;

      // 2. Atualiza status pra enviada (trigger valida senha + seta sent_at)
      const upd = await supabase
        .from("proposals" as any)
        .update({
          status: "enviada",
          expires_at: validade,
          valid_until: validade,
        })
        .eq("id", proposalId)
        .select("access_token")
        .single();
      if (upd.error) throw upd.error;

      // 3. Registra evento
      await supabase.from("proposal_events" as any).insert({
        proposal_id: proposalId,
        event_type: "sent",
        metadata: { source: "editor" },
      });

      const token = (upd.data as any)?.access_token as string;
      onOpenChange(false);
      setPassword("");
      onSent({ accessToken: token, expiresAt: validade });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao marcar como enviada");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar {proposalCode} como enviada</DialogTitle>
          <DialogDescription>
            Esta proposta vai gerar um link de acesso. A senha será criptografada
            e não poderá ser recuperada — apenas redefinida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prop-password">Senha de acesso *</Label>
            <div className="relative">
              <Input
                id="prop-password"
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
            <p className="text-[11px] text-muted-foreground">
              Compartilhe a senha com o cliente fora deste sistema (WhatsApp, e-mail).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prop-validade">Validade da proposta</Label>
            <Input
              id="prop-validade"
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || password.length < 4}>
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Marcar como enviada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
