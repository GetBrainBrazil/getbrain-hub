import { useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Send,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Mail,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
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
import { setProposalPassword } from "@/lib/orcamentos/proposalPassword";
import { toast } from "sonner";

const PUBLIC_BASE = "https://hub.getbrain.com.br/p";

interface Props {
  proposalId: string;
  proposalCode: string;
  /** Senha sugerida (ex: gerada por createProposalFromDeal). Editável. */
  suggestedPassword?: string;
  expiresAt: string;
  clientLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Disparado depois que tudo deu certo, para o pai atualizar o estado local. */
  onDone?: (info: { accessToken: string; password: string; expiresAt: string }) => void;
}

type Phase = "form" | "submitting" | "success";

export function GerarEEnviarDialog({
  proposalId,
  proposalCode,
  suggestedPassword = "",
  expiresAt,
  clientLabel,
  open,
  onOpenChange,
  onDone,
}: Props) {
  const [phase, setPhase] = useState<Phase>("form");
  const [password, setPassword] = useState(suggestedPassword);
  const [showPwd, setShowPwd] = useState(false);
  const [validade, setValidade] = useState(expiresAt);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);
  const [copiedBoth, setCopiedBoth] = useState(false);

  // Reset on open
  function handleOpenChange(o: boolean) {
    if (phase === "submitting") return;
    if (!o) {
      setTimeout(() => {
        setPhase("form");
        setAccessToken(null);
        setCopiedLink(false);
        setCopiedPwd(false);
        setCopiedBoth(false);
      }, 200);
    } else {
      setPassword(suggestedPassword);
      setValidade(expiresAt);
    }
    onOpenChange(o);
  }

  const url = accessToken ? `${PUBLIC_BASE}/${accessToken}` : "";
  const combinedMessage = `Olá! Segue a proposta ${proposalCode}:\n\n🔗 ${url}\n🔑 Senha: ${password}\n\nVálida até ${formatDate(validade)}.`;

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

  async function handleConfirm() {
    if (password.length < 4) {
      toast.error("Senha precisa ter ao menos 4 caracteres");
      return;
    }
    if (!validade) {
      toast.error("Defina a data de validade");
      return;
    }
    setPhase("submitting");
    try {
      await setProposalPassword({ proposalId, plainPassword: password });

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

      await supabase.from("proposal_events" as any).insert({
        proposal_id: proposalId,
        event_type: "sent",
        metadata: { source: "gerar_e_enviar" },
      });

      const tk = (upd.data as any)?.access_token as string;
      setAccessToken(tk);
      setPhase("success");
      onDone?.({ accessToken: tk, password, expiresAt: validade });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar e enviar");
      setPhase("form");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        {phase === "success" && accessToken ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-success" />
                Proposta pronta para enviar
              </DialogTitle>
              <DialogDescription>
                Compartilhe link e senha com {clientLabel}. Recomendamos canais
                separados (link por email, senha por WhatsApp).
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
                    size="sm"
                  >
                    {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Senha de acesso
                </label>
                <div className="flex gap-2">
                  <Input value={password} readOnly className="font-mono text-sm" />
                  <Button
                    onClick={() => copyTo(password, setCopiedPwd, "Senha")}
                    variant="outline"
                    size="sm"
                  >
                    {copiedPwd ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="mt-2 flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Anote a senha agora.</strong> Por segurança, ela não
                    pode ser recuperada depois — apenas redefinida.
                  </span>
                </div>
              </div>

              <Button
                onClick={() => copyTo(combinedMessage, setCopiedBoth, "Mensagem completa")}
                variant="secondary"
                className="w-full"
              >
                {copiedBoth ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copiar mensagem pronta (link + senha)
              </Button>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(combinedMessage)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      `Proposta ${proposalCode} — GetBrain`,
                    )}&body=${encodeURIComponent(combinedMessage)}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir
                  </a>
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)} className="w-full">
                Concluir
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Gerar e enviar {proposalCode}</DialogTitle>
              <DialogDescription>
                A proposta será marcada como enviada, ganhará link público e a
                senha será criptografada — sem volta.
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
                    className="pr-10 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => setShowPwd((v) => !v)}
                  >
                    {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                {suggestedPassword && password === suggestedPassword && (
                  <p className="text-[11px] text-muted-foreground">
                    Sugestão automática a partir do nome do cliente. Você pode trocar.
                  </p>
                )}
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
                onClick={() => handleOpenChange(false)}
                disabled={phase === "submitting"}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={phase === "submitting" || password.length < 4}
              >
                {phase === "submitting" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Gerar e enviar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
  } catch {
    return iso;
  }
}
