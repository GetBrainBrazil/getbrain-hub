import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PDF_OPTIONS } from "@/lib/orcamentos/pdfConfig";

interface Args {
  proposalId: string;
  code: string;
  clientName: string;
  elementId: string;
}

export function useGeneratePDF() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ proposalId, code, clientName, elementId }: Args) => {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById(elementId);
      if (!element) throw new Error("Template PDF não encontrado no DOM");

      const safeName = clientName
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/(^-|-$)/g, "")
        .toLowerCase();
      const filename = `proposta-${code}-${safeName || "cliente"}.pdf`;
      const opt = PDF_OPTIONS(filename);

      // Gera Blob para upload + ArrayBuffer cópia para download
      const worker = html2pdf().set(opt).from(element);
      const pdfBlob: Blob = await worker.output("blob");

      // Upload para Storage
      const path = `${proposalId}/proposta-${code}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("proposals")
        .upload(path, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage
        .from("proposals")
        .getPublicUrl(path);

      await supabase
        .from("proposals" as any)
        .update({
          pdf_url: urlData.publicUrl,
          pdf_generated_at: new Date().toISOString(),
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

      return urlData.publicUrl;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["proposal", vars.proposalId] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("PDF gerado e salvo");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao gerar PDF");
    },
  });
}
