/**
 * Cartão "Acesso do cliente" no editor de proposta.
 *
 * Mostra:
 * - Link público (URL `/p/:token` — futuramente trocada pelo subdomínio amigável).
 * - Senha em texto, com botão pra mostrar/ocultar e copiar.
 * - Botão "Ver como cliente" que abre a proposta web em nova aba já autenticada
 *   (usa previewProposalAsClient).
 * - Botão "Redefinir senha" abre o RedefinirSenhaDialog existente.
 * - Botão "Voltar pra senha padrão" regenera {slug}@2026.
 */
import { useState } from "react";
import {
  Eye,
  EyeOff,
  Copy,
  Link2,
  KeyRound,
  RotateCcw,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setProposalPassword } from "@/lib/orcamentos/proposalPassword";
import { defaultProposalPassword } from "@/lib/orcamentos/companySlug";
import { previewProposalAsClient } from "@/lib/orcamentos/previewAsClient";
import { useConfirm } from "@/components/ConfirmDialog";
import { RedefinirSenhaDialog } from "@/components/orcamentos/RedefinirSenhaDialog";

interface Props {
  proposalId: string;
  proposalCode: string;
  clientName: string;
  accessToken: string | null;
  passwordPlain: string | null;
  hasPasswordHash: boolean;
  onPasswordUpdated: () => void;
}

export function AcessoClienteCard({
  proposalId,
  proposalCode,
  clientName,
  accessToken,
  passwordPlain,
  hasPasswordHash,
  onPasswordUpdated,
}: Props) {
  const [showPwd, setShowPwd] = useState(false);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const { confirm, dialog } = useConfirm();

  const publicUrl = accessToken
    ? `${window.location.origin}/p/${accessToken}`
    : null;

  const effectivePwd = passwordPlain || defaultProposalPassword(clientName);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  }

  async function handleResetToDefault() {
    const newPwd = defaultProposalPassword(clientName);
    const ok = await confirm({
      title: "Voltar pra senha padrão?",
      description: `A senha será redefinida para: ${newPwd}`,
      confirmLabel: "Redefinir",
    });
    if (!ok) return;
    setResetting(true);
    try {
      await setProposalPassword({ proposalId, plainPassword: newPwd });
      toast.success("Senha padrão restaurada");
      onPasswordUpdated();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao redefinir senha");
    } finally {
      setResetting(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    try {
      await previewProposalAsClient(proposalId);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao abrir preview");
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" /> Acesso do cliente
        </h3>
      </div>

      {/* Link */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Link público
        </label>
        {publicUrl ? (
          <div className="flex items-center gap-1">
            <code className="flex-1 truncate rounded bg-muted/50 px-2 py-1.5 text-xs font-mono">
              {publicUrl}
            </code>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={() => copy(publicUrl, "Link")}
              title="Copiar link"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              asChild
              title="Abrir em nova aba"
            >
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Link2 className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Link gerado quando a proposta for enviada
          </p>
        )}
      </div>

      {/* Senha */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Senha
        </label>
        <div className="flex items-center gap-1">
          <code className="flex-1 truncate rounded bg-muted/50 px-2 py-1.5 text-xs font-mono">
            {showPwd ? effectivePwd : "•".repeat(Math.min(12, effectivePwd.length))}
          </code>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={() => setShowPwd((v) => !v)}
            title={showPwd ? "Ocultar" : "Mostrar"}
          >
            {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={() => copy(effectivePwd, "Senha")}
            title="Copiar senha"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        {!passwordPlain && hasPasswordHash && (
          <p className="text-[10px] text-amber-500">
            Senha personalizada — clique em "Redefinir" pra trocar
          </p>
        )}
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-1.5 pt-1">
        <Button
          size="sm"
          variant="default"
          onClick={handlePreview}
          disabled={previewing}
          className="w-full"
        >
          {previewing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5" />
          )}
          Ver como cliente
        </Button>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPwdDialogOpen(true)}
          >
            <KeyRound className="h-3.5 w-3.5" /> Redefinir
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetToDefault}
            disabled={resetting}
            title={`Voltar para ${defaultProposalPassword(clientName)}`}
          >
            {resetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Padrão
          </Button>
        </div>
      </div>

      {pwdDialogOpen && (
        <RedefinirSenhaDialog
          open={pwdDialogOpen}
          onOpenChange={setPwdDialogOpen}
          proposalId={proposalId}
          proposalCode={proposalCode}
          clientName={clientName}
          onSuccess={onPasswordUpdated}
        />
      )}
      {dialog}
    </Card>
  );
}
