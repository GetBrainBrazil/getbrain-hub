/**
 * Hooks para gerenciar anexos de uma proposta.
 *
 * - useProposalAttachments(proposalId): lista anexos ordenados.
 * - useUploadAttachment: faz upload no bucket `proposal-attachments` + insert em `proposal_attachments`.
 * - useUpdateAttachment: edita label, kind, ordem, flags de visibilidade.
 * - useDeleteAttachment: remove row + arquivo.
 * - useReorderAttachments: persiste nova ordem em batch.
 *
 * Usa signed URLs (60s) pra preview interno (operador autenticado lê direto via storage).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateProposalCaches } from "@/lib/cacheInvalidation";

export type AttachmentKind = "organograma" | "documento" | "imagem" | "outro";

export interface ProposalAttachment {
  id: string;
  proposal_id: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  label: string;
  kind: AttachmentKind;
  display_order: number;
  show_in_pdf: boolean;
  show_in_web: boolean;
  created_at: string;
  created_by: string | null;
}

const BUCKET = "proposal-attachments";

function inferKind(mime: string, name: string): AttachmentKind {
  if (mime.startsWith("image/")) {
    if (/organo|org-/i.test(name)) return "organograma";
    return "imagem";
  }
  if (mime === "application/pdf") return "documento";
  return "outro";
}

function sanitizeName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function useProposalAttachments(proposalId: string | undefined) {
  return useQuery({
    queryKey: ["proposal_attachments", proposalId],
    enabled: !!proposalId,
    queryFn: async (): Promise<ProposalAttachment[]> => {
      const { data, error } = await supabase
        .from("proposal_attachments" as any)
        .select("*")
        .eq("proposal_id", proposalId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      proposalId,
      file,
      label,
      kind,
    }: {
      proposalId: string;
      file: File;
      label?: string;
      kind?: AttachmentKind;
    }) => {
      const detectedKind = kind ?? inferKind(file.type, file.name);
      const safeName = sanitizeName(file.name);
      const path = `${proposalId}/${crypto.randomUUID()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (upErr) throw upErr;

      // Pega próximo display_order
      const { data: lastRow } = await supabase
        .from("proposal_attachments" as any)
        .select("display_order")
        .eq("proposal_id", proposalId)
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = ((lastRow as any)?.display_order ?? -1) + 1;

      const { data, error } = await supabase
        .from("proposal_attachments" as any)
        .insert({
          proposal_id: proposalId,
          file_path: path,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          label: label?.trim() || file.name,
          kind: detectedKind,
          display_order: nextOrder,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProposalAttachment;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["proposal_attachments", vars.proposalId] });
      invalidateProposalCaches(qc, { proposalId: vars.proposalId });
    },
  });
}

export function useUpdateAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      proposalId: _proposalId,
      patch,
    }: {
      id: string;
      proposalId: string;
      patch: Partial<Pick<ProposalAttachment, "label" | "kind" | "display_order" | "show_in_pdf" | "show_in_web">>;
    }) => {
      const { data, error } = await supabase
        .from("proposal_attachments" as any)
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProposalAttachment;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["proposal_attachments", vars.proposalId] });
    },
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      proposalId: _proposalId,
      filePath,
    }: {
      id: string;
      proposalId: string;
      filePath: string;
    }) => {
      // Remove arquivo (best-effort) + row
      await supabase.storage.from(BUCKET).remove([filePath]);
      const { error } = await supabase
        .from("proposal_attachments" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["proposal_attachments", vars.proposalId] });
      invalidateProposalCaches(qc, { proposalId: vars.proposalId });
    },
  });
}

export function useReorderAttachments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      proposalId: _proposalId,
      orderedIds,
    }: {
      proposalId: string;
      orderedIds: string[];
    }) => {
      // Atualiza um por um — lista costuma ser pequena (<20).
      await Promise.all(
        orderedIds.map((id, idx) =>
          supabase
            .from("proposal_attachments" as any)
            .update({ display_order: idx })
            .eq("id", id),
        ),
      );
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["proposal_attachments", vars.proposalId] });
    },
  });
}

/** Gera signed URL temporária pra preview no app interno (operador autenticado). */
export async function getInternalAttachmentUrl(filePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60);
  return data?.signedUrl ?? null;
}
