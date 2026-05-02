/**
 * Hook que gera o PDF de uma proposta via React-PDF (client-side),
 * faz upload no bucket `proposals` e registra a versão chamando a edge
 * function `register-proposal-pdf-version`.
 *
 * Substitui o fluxo legado `useGeneratePDF` (html2pdf.js → DOM).
 *
 * Em caso de falha no render/upload, dispara mode="failure" pra deixar
 * trilha em audit_logs (`pdf_generation_failed`).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PROPOSALS_BUCKET,
  buildProposalPdfPath,
} from "@/lib/orcamentos/storageConfig";
import { getTemplate } from "@/lib/orcamentos/templates";
import type { TemplateKey } from "@/lib/orcamentos/templates";
import { mapProposalToTemplateData } from "@/lib/orcamentos/mapProposalToTemplateData";
import { invalidateProposalCaches } from "@/lib/cacheInvalidation";

interface Args {
  proposalId: string;
  proposal: any; // ProposalDetail (raw row do banco)
  templateKey?: TemplateKey | string | null;
  /** Se true, registra como `pdf_regenerated` em audit_logs. */
  isRegeneration?: boolean;
  /** Se true, faz download local após sucesso. */
  triggerDownload?: boolean;
  /** Texto livre exibido no histórico de versões. */
  notes?: string | null;
}

interface Result {
  versionNumber: number;
  pdfStoragePath: string;
  blob: Blob;
}

async function reportFailure(
  proposalId: string,
  templateKey: string,
  templateVersion: string,
  error: unknown,
) {
  try {
    await supabase.functions.invoke("register-proposal-pdf-version", {
      body: {
        mode: "failure",
        proposal_id: proposalId,
        template_key: templateKey,
        template_version: templateVersion,
        error_message: String((error as any)?.message || error).slice(0, 2000),
      },
    });
  } catch {
    /* swallow — não queremos mascarar o erro original */
  }
}

export function useGenerateProposalPDF() {
  const qc = useQueryClient();

  return useMutation<Result, Error, Args>({
    mutationFn: async ({
      proposalId,
      proposal,
      templateKey,
      isRegeneration = false,
      triggerDownload = true,
      notes = null,
    }) => {
      const template = getTemplate(templateKey ?? proposal?.template_key);
      const templateVersion = template.config.version;
      const PDFComponent = template.PDFComponent;

      try {
        // 1) Mapear dados → shape do template
        const data = mapProposalToTemplateData(proposal);

        // 2) URL pública (preparada pro QR code do 10D-2). Apenas best-effort.
        const accessUrl = `${window.location.origin}/p/${proposalId}`;

        // 3) Render React-PDF → blob
        const blob = await pdf(
          <PDFComponent
            data={data}
            templateVersion={templateVersion}
            proposalAccessUrl={accessUrl}
          />,
        ).toBlob();

        // 4) Calcular próxima versão pra montar path (a edge revalida via trigger)
        const { data: lastVersion } = await supabase
          .from("proposal_versions" as any)
          .select("version_number")
          .eq("proposal_id", proposalId)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextVersion = ((lastVersion as any)?.version_number || 0) + 1;
        const path = buildProposalPdfPath(proposalId, nextVersion);

        // 5) Upload no bucket privado
        const { error: upErr } = await supabase.storage
          .from(PROPOSALS_BUCKET)
          .upload(path, blob, {
            contentType: "application/pdf",
            upsert: false,
          });
        if (upErr) throw upErr;

        // 6) Registra versão + audit via edge function
        const { data: regRes, error: regErr } = await supabase.functions.invoke(
          "register-proposal-pdf-version",
          {
            body: {
              mode: "success",
              proposal_id: proposalId,
              pdf_storage_path: path,
              pdf_size_bytes: blob.size,
              template_key: template.config.key,
              template_version: templateVersion,
              is_regeneration: isRegeneration,
              notes,
              snapshot: data,
            },
          },
        );
        if (regErr) throw regErr;

        const versionNumber =
          (regRes as any)?.version_number ?? nextVersion;

        // 7) Download local opcional
        if (triggerDownload) {
          const safeName = (data.client_name || "cliente")
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/(^-|-$)/g, "")
            .toLowerCase();
          const filename = `proposta-${data.code}-v${versionNumber}-${safeName}.pdf`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }

        return { versionNumber, pdfStoragePath: path, blob };
      } catch (err) {
        await reportFailure(proposalId, template.config.key, templateVersion, err);
        throw err;
      }
    },
    onSuccess: (res, vars) => {
      invalidateProposalCaches(qc, vars.proposalId);
      toast.success(
        vars.isRegeneration
          ? `Versão v${res.versionNumber} regenerada`
          : `PDF v${res.versionNumber} gerado`,
      );
    },
    onError: (e) => {
      toast.error(e?.message || "Erro ao gerar PDF");
    },
  });
}

/**
 * Helper isolado para preview no editor: renderiza o PDF mas NÃO faz upload
 * nem cria versão. Retorna apenas o blob URL para abrir num iframe ou nova aba.
 */
export async function renderProposalPdfPreview(
  proposal: any,
  templateKey?: TemplateKey | string | null,
): Promise<{ blob: Blob; url: string }> {
  const template = getTemplate(templateKey ?? proposal?.template_key);
  const data = mapProposalToTemplateData(proposal);
  const accessUrl = `${window.location.origin}/p/${proposal.id}`;
  const blob = await pdf(
    <template.PDFComponent
      data={data}
      templateVersion={template.config.version}
      proposalAccessUrl={accessUrl}
    />,
  ).toBlob();
  return { blob, url: URL.createObjectURL(blob) };
}
