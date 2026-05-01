import { supabase } from "@/integrations/supabase/client";

/**
 * Solicita um JWT curto (5min) para pré-visualizar a proposta como o cliente
 * verá. Aciona a edge function `preview-proposal-as-internal` (auth obrigatória)
 * e abre uma nova aba em /p/{token}?preview={jwt}.
 */
export async function previewProposalAsClient(params: {
  proposalId: string;
  accessToken: string | null;
}): Promise<void> {
  const { proposalId, accessToken } = params;
  if (!accessToken) {
    throw new Error("Esta proposta ainda não tem link público — gere e envie primeiro.");
  }
  const { data, error } = await supabase.functions.invoke(
    "preview-proposal-as-internal",
    { body: { proposal_id: proposalId } },
  );
  if (error) throw error;
  const jwt = (data as any)?.access_jwt as string | undefined;
  if (!jwt) throw new Error("Falha ao gerar JWT de preview");

  const base = window.location.origin;
  const url = `${base}/p/${accessToken}?preview=${encodeURIComponent(jwt)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
