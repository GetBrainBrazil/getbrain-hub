import { useEffect, useMemo, useState } from "react";
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
  User,
  Phone,
  AtSign,
  UserX,
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
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { setProposalPassword } from "@/lib/orcamentos/proposalPassword";
import { usePrimaryContact } from "@/hooks/crm/usePrimaryContact";
import { useRecordAutoInteraction } from "@/hooks/orcamentos/useProposalInteractions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PUBLIC_BASE = "https://hub.getbrain.com.br/p";

interface Props {
  proposalId: string;
  proposalCode: string;
  /** ID da company vinculada (CRM) — usado para carregar contato principal */
  companyId?: string | null;
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

/** Limpa formato do telefone para o link wa.me — apenas dígitos. */
function cleanPhone(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

function firstName(full: string | null | undefined): string {
  if (!full) return "";
  return full.trim().split(/\s+/)[0] || "";
}

export function GerarEEnviarDialog({
  proposalId,
  proposalCode,
  companyId,
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

  // Contato principal do CRM
  const primaryContact = usePrimaryContact(companyId);
  const recordAuto = useRecordAutoInteraction();

  // Destinatário editável (preenche a partir do contato principal quando carrega)
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [sendByWhatsapp, setSendByWhatsapp] = useState(true);
  const [sendByEmail, setSendByEmail] = useState(false);

  // Hidrata destinatário quando o contato carrega (e quando dialog abre)
  useEffect(() => {
    if (!open) return;
    const c = primaryContact.data;
    if (c) {
      setRecipientName(c.fullName || "");
      setRecipientEmail(c.email || "");
      setRecipientPhone(c.phone || "");
      setSendByWhatsapp(!!c.phone);
      setSendByEmail(false); // email automático ainda não está disponível — ver §3 abaixo
    } else {
      setRecipientName("");
      setRecipientEmail("");
      setRecipientPhone("");
      setSendByWhatsapp(false);
      setSendByEmail(false);
    }
  }, [open, primaryContact.data]);

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
  const greeting = firstName(recipientName) ? `Olá, ${firstName(recipientName)}!` : "Olá!";
  const combinedMessage = useMemo(
    () =>
      `${greeting} Segue a proposta ${proposalCode}:\n\n🔗 ${url}\n🔑 Senha: ${password}\n\nVálida até ${formatDate(validade)}.`,
    [greeting, proposalCode, url, password, validade],
  );

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

  /** Dispara WhatsApp para o telefone informado e registra interação. */
  function fireWhatsapp(token: string, msgOverride?: string) {
    const phone = cleanPhone(recipientPhone);
    const finalUrl = `${PUBLIC_BASE}/${token}`;
    const finalMsg =
      msgOverride ||
      `${firstName(recipientName) ? `Olá, ${firstName(recipientName)}!` : "Olá!"} Segue a proposta ${proposalCode}:\n\n🔗 ${finalUrl}\n🔑 Senha: ${password}\n\nVálida até ${formatDate(validade)}.`;
    const link = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(finalMsg)}`
      : `https://wa.me/?text=${encodeURIComponent(finalMsg)}`;
    const win = window.open(link, "_blank", "noopener,noreferrer");
    if (!win) {
      toast.warning("Pop-up bloqueado — copie a mensagem e abra o WhatsApp manualmente.", {
        action: {
          label: "Copiar mensagem",
          onClick: () => copyTo(finalMsg, setCopiedBoth, "Mensagem completa"),
        },
        duration: 8000,
      });
      return;
    }
    recordAuto.mutate({
      proposalId,
      channel: "whatsapp",
      direction: "outbound",
      interactionAt: new Date().toISOString(),
      summary: `Proposta enviada por WhatsApp${recipientName ? ` para ${recipientName}` : ""}`,
      details: phone ? `Para: ${phone}` : null,
      autoGenerated: true,
      metadata: { trigger: "gerar_e_enviar", recipient_phone: phone || null },
    });
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
    if (sendByWhatsapp && !cleanPhone(recipientPhone)) {
      toast.error("Telefone do destinatário é obrigatório para WhatsApp");
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
        metadata: {
          source: "gerar_e_enviar",
          channels: [
            sendByWhatsapp ? "whatsapp" : null,
            sendByEmail ? "email" : null,
          ].filter(Boolean),
          recipient_name: recipientName || null,
        },
      });

      const tk = (upd.data as any)?.access_token as string;
      setAccessToken(tk);

      // Dispara canais escolhidos
      if (sendByWhatsapp) {
        fireWhatsapp(tk);
      }
      if (sendByEmail) {
        // Por enquanto fallback para mailto: (sem provedor de email configurado)
        const mailto = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(
          `Proposta ${proposalCode} — GetBrain`,
        )}&body=${encodeURIComponent(
          `${greeting} Segue a proposta:\n\n${PUBLIC_BASE}/${tk}\nSenha: ${password}\nVálida até ${formatDate(validade)}`,
        )}`;
        window.open(mailto, "_blank");
        recordAuto.mutate({
          proposalId,
          channel: "email",
          direction: "outbound",
          interactionAt: new Date().toISOString(),
          summary: `Proposta enviada por email${recipientName ? ` para ${recipientName}` : ""}`,
          details: recipientEmail || null,
          autoGenerated: true,
          metadata: { trigger: "gerar_e_enviar", recipient_email: recipientEmail || null, mode: "mailto" },
        });
      }

      setPhase("success");
      onDone?.({ accessToken: tk, password, expiresAt: validade });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar e enviar");
      setPhase("form");
    }
  }

  const noContact = !primaryContact.isLoading && !primaryContact.data;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {phase === "success" && accessToken ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-success" />
                Proposta enviada
              </DialogTitle>
              <DialogDescription>
                {sendByWhatsapp || sendByEmail
                  ? `Disparada para ${recipientName || clientLabel}. Você ainda pode reenviar pelos atalhos abaixo.`
                  : `Compartilhe link e senha com ${clientLabel}. Recomendamos canais separados.`}
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
                    A senha fica visível no Resumo enquanto a proposta estiver ativa, e
                    pode ser redefinida a qualquer momento.
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fireWhatsapp(accessToken!)}
                  disabled={!cleanPhone(recipientPhone) && !recipientName}
                  title={
                    cleanPhone(recipientPhone)
                      ? `Enviar para ${recipientPhone}`
                      : "Abrir WhatsApp Web"
                  }
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {cleanPhone(recipientPhone) ? "Reenviar" : "WhatsApp"}
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(
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
                A proposta será marcada como enviada, ganhará link público e senha. Em seguida,
                disparamos pelos canais selecionados abaixo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Cartão do destinatário */}
              <div
                className={cn(
                  "rounded-lg border p-3 space-y-3",
                  noContact
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-accent/20 bg-accent/5",
                )}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {noContact ? (
                      <UserX className="h-4 w-4 text-amber-500" />
                    ) : (
                      <User className="h-4 w-4 text-accent" />
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Destinatário
                      {primaryContact.data?.role && (
                        <span className="ml-2 text-[10px] font-mono text-muted-foreground/70 normal-case">
                          {primaryContact.data.role}
                        </span>
                      )}
                    </span>
                  </div>
                  {primaryContact.isLoading && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>

                {noContact ? (
                  <p className="text-xs text-foreground/80">
                    Esta empresa não tem contato cadastrado no CRM. Você pode preencher
                    manualmente abaixo, ou{" "}
                    {companyId ? (
                      <a
                        href={`/crm/empresas/${companyId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline"
                      >
                        abrir o CRM em nova aba
                      </a>
                    ) : (
                      "vincular um deal do CRM antes"
                    )}
                    .
                  </p>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Nome</Label>
                    <div className="relative">
                      <User className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                      <Input
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Nome do contato"
                        className="pl-7 h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">WhatsApp</Label>
                    <div className="relative">
                      <Phone className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                      <Input
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="55 21 9xxxx-xxxx"
                        className="pl-7 h-9 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] text-muted-foreground">Email</Label>
                    <div className="relative">
                      <AtSign className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                      <Input
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="email@empresa.com"
                        type="email"
                        className="pl-7 h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/40 pt-2 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Canais
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={sendByWhatsapp}
                      onCheckedChange={(v) => setSendByWhatsapp(v === true)}
                      disabled={!cleanPhone(recipientPhone)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5 text-success" />
                        WhatsApp
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        {cleanPhone(recipientPhone)
                          ? `Abre o WhatsApp já com a mensagem para ${recipientPhone}`
                          : "Preencha o telefone para habilitar"}
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={sendByEmail}
                      onCheckedChange={(v) => setSendByEmail(v === true)}
                      disabled={!recipientEmail}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        Email
                        <span className="text-[10px] font-mono uppercase text-muted-foreground/70 bg-muted/40 rounded px-1 py-0.5">
                          via app de email
                        </span>
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Por enquanto abre seu cliente de email com a mensagem pronta. Envio
                        automático sai assim que configurarmos o domínio de envio.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

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
                {sendByWhatsapp || sendByEmail ? "Gerar e enviar" : "Apenas gerar link"}
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
