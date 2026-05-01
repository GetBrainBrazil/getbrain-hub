import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PDF_OPTIONS } from "@/lib/orcamentos/pdfConfig";
import { PROPOSALS_BUCKET } from "@/lib/orcamentos/storageConfig";

interface Args {
  proposalId: string;
  code: string;
  clientName: string;
  elementId: string;
  /** Estado completo da proposta no momento da geração — vai pra coluna snapshot. */
  snapshot: Record<string, any>;
}

/**
 * Gera o PDF a partir do DOM, faz upload para Storage em
 * `proposals/{proposalId}/v{N}-{ts}.pdf`, cria registro em `proposal_versions`
 * com snapshot do estado atual, atualiza `proposals.pdf_url` (última versão)
 * e dispara download local.
 */
export function useGeneratePDF() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      proposalId,
      code,
      clientName,
      elementId,
      snapshot,
    }: Args) => {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById(elementId);
      if (!element) throw new Error("Template PDF não encontrado no DOM");

      const safeName = clientName
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/(^-|-$)/g, "")
        .toLowerCase();

      // Calcula próxima versão
      const { data: lastVersion } = await supabase
        .from("proposal_versions" as any)
        .select("version_number")
        .eq("proposal_id", proposalId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextVersion = ((lastVersion as any)?.version_number || 0) + 1;

      const filename = `proposta-${code}-v${nextVersion}-${safeName || "cliente"}.pdf`;
      const opt = PDF_OPTIONS(filename);

      const worker = html2pdf().set(opt).from(element);
      const pdfBlob: Blob = await worker.output("blob");

      const timestamp = Date.now();
      const path = `${proposalId}/v${nextVersion}-${timestamp}.pdf`;

      const { error: upErr } = await supabase.storage
        .from(PROPOSALS_BUCKET)
        .upload(path, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (upErr) throw upErr;

      const userRes = await supabase.auth.getUser();
      const uid = userRes.data.user?.id ?? null;

      // Lê org/template da proposta-pai p/ snapshot multi-tenant
      const { data: parent } = await supabase
        .from("proposals" as any)
        .select("organization_id, template_key, template_version")
        .eq("id", proposalId)
        .maybeSingle();

      const { error: insErr } = await supabase
        .from("proposal_versions" as any)
        .insert({
          proposal_id: proposalId,
          organization_id: (parent as any)?.organization_id ?? null,
          version_number: nextVersion,
          // Bucket privado: armazenamos o path em ambas as colunas (legacy + nova)
          pdf_url: path,
          pdf_storage_path: path,
          pdf_size_bytes: pdfBlob.size,
          template_key: (parent as any)?.template_key ?? null,
          template_version: (parent as any)?.template_version ?? null,
          generated_by: uid,
          created_by: uid,
          updated_by: uid,
          snapshot,
        });
      if (insErr) throw insErr;

      const nowIso = new Date().toISOString();
      await supabase
        .from("proposals" as any)
        .update({
          pdf_url: path,
          pdf_generated_at: nowIso,
        })
        .eq("id", proposalId);

      // Download local
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      return { path, version: nextVersion };
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["proposal", vars.proposalId] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["proposal_versions", vars.proposalId] });
      toast.success(`Versão v${res.version} gerada e baixada`);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao gerar PDF");
    },
  });
}
