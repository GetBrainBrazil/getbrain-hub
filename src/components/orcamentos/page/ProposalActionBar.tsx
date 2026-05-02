/**
 * Action bar fixa no rodapé do editor de proposta.
 *
 * Layout em 3 zonas:
 *  - ESQUERDA (destrutivo): Excluir
 *  - CENTRO   (consulta — não muda estado): Copiar Link · Ver como cliente · Baixar PDF
 *  - DIREITA  (envio/edição): WhatsApp · Salvar · Gerar e Enviar (ou Reenviar)
 *
 * Comportamento por status:
 *  - rascunho                : tudo habilitado, "Gerar e Enviar"
 *  - enviada/visualizada/    : "Gerar e Enviar" → "Reenviar" (regerar PDF e reenviar link)
 *    interesse_manifestado/    confirmação extra para excluir
 *    expirada
 *  - convertida/recusada     : modo somente-leitura (apenas Copiar Link, Ver como cliente,
 *                              Baixar PDF). Sem edição/envio.
 *
 * Mobile: layout colapsa em "principais sempre + overflow menu" para preservar
 * o botão primário (Salvar / Gerar e Enviar) em qualquer largura.
 *
 * Auto-registro: clicar no botão WhatsApp dispara um `onWhatsAppClick` que o
 * orquestrador usa para inserir uma `proposal_interaction` com auto_generated=true.
 */
import { useState } from "react";
import {
  Trash2,
  Copy,
  Eye,
  Download,
  MessageCircle,
  Save,
  Send,
  RefreshCw,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ProposalStatus } from "@/lib/orcamentos/calculateTotal";

interface Props {
  status: ProposalStatus;
  isDirty: boolean;
  isSaving: boolean;
  isGeneratingPdf: boolean;
  hasPublicLink: boolean;
  onDelete: () => void;
  onCopyLink: () => void;
  onPreviewAsClient: () => void;
  onDownloadPdf: () => void;
  onOpenWhatsApp: () => void;
  onSave: () => void;
  onSendOrResend: () => void;
}

export function ProposalActionBar({
  status,
  isDirty,
  isSaving,
  isGeneratingPdf,
  hasPublicLink,
  onDelete,
  onCopyLink,
  onPreviewAsClient,
  onDownloadPdf,
  onOpenWhatsApp,
  onSave,
  onSendOrResend,
}: Props) {
  const [confirmDeleteSent, setConfirmDeleteSent] = useState(false);

  const isReadOnly = status === "convertida" || status === "recusada";
  const isPostSend = !isReadOnly && status !== "rascunho"; // enviada, visualizada, interesse_manifestado, expirada

  function handleDeleteClick() {
    if (isPostSend && !confirmDeleteSent) {
      // Confirmação extra para propostas já enviadas: 1º clique pede atenção,
      // 2º clique dispara o fluxo (que ainda passa pelo modal real).
      setConfirmDeleteSent(true);
      window.setTimeout(() => setConfirmDeleteSent(false), 3000);
      return;
    }
    onDelete();
  }

  const showSendButton = !isReadOnly;
  const sendLabel = status === "rascunho" ? "Gerar e enviar" : "Reenviar";
  const SendIcon = status === "rascunho" ? Send : RefreshCw;

  return (
    <footer
      className="sticky bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur px-3 sm:px-5 py-2.5"
      role="toolbar"
      aria-label="Ações da proposta"
    >
      <div className="flex items-center gap-2 flex-wrap">
        {/* ESQUERDA — destrutivo (sempre acessível, exceto somente-leitura terminal recebe ainda outra confirmação a montante) */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteClick}
          className={cn(
            "h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30",
            confirmDeleteSent && "bg-destructive/10",
          )}
          title={
            isPostSend && !confirmDeleteSent
              ? "Esta proposta já foi enviada — clique novamente para confirmar"
              : "Excluir proposta"
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">
            {confirmDeleteSent ? "Clique de novo" : "Excluir"}
          </span>
        </Button>

        <div className="flex-1" />

        {/* CENTRO — consulta */}
        <div className="hidden md:flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopyLink}
            disabled={!hasPublicLink}
            className="h-8"
            title={hasPublicLink ? "Copiar link público" : "Disponível após enviar"}
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Copiar link</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreviewAsClient}
            disabled={!hasPublicLink}
            className="h-8"
            title={hasPublicLink ? "Abrir página pública pré-autenticada" : "Disponível após enviar"}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Ver como cliente</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownloadPdf}
            disabled={isGeneratingPdf}
            className="h-8"
            title="Baixar última versão do PDF"
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden lg:inline">PDF</span>
          </Button>
        </div>

        {/* DIREITA — envio/edição */}
        <div className="flex items-center gap-1.5 ml-auto md:ml-2">
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenWhatsApp}
              disabled={!hasPublicLink}
              className="h-8"
              title={hasPublicLink ? "Abrir WhatsApp com mensagem pronta" : "Disponível após enviar"}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden md:inline">WhatsApp</span>
            </Button>
          )}

          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={!isDirty || isSaving}
              className="h-8"
              title="Forçar save (auto-save já roda em segundo plano)"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span className="hidden md:inline">Salvar</span>
            </Button>
          )}

          {showSendButton && (
            <Button
              size="sm"
              onClick={onSendOrResend}
              disabled={isGeneratingPdf}
              className="h-8 bg-accent hover:bg-accent/90 text-accent-foreground"
              title={status === "rascunho" ? "Gerar PDF e enviar ao cliente" : "Gerar nova versão e reenviar"}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <SendIcon className="h-3.5 w-3.5" />
              )}
              <span>{sendLabel}</span>
            </Button>
          )}

          {/* Mobile overflow — quando os botões centrais somem em telas <md */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden" title="Mais ações">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onCopyLink} disabled={!hasPublicLink}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Copiar link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPreviewAsClient} disabled={!hasPublicLink}>
                <Eye className="h-3.5 w-3.5 mr-2" /> Ver como cliente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownloadPdf} disabled={isGeneratingPdf}>
                <Download className="h-3.5 w-3.5 mr-2" /> Baixar PDF
              </DropdownMenuItem>
              {!isReadOnly && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onOpenWhatsApp} disabled={!hasPublicLink}>
                    <MessageCircle className="h-3.5 w-3.5 mr-2" /> WhatsApp
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </footer>
  );
}
