/**
 * Tipos do módulo `proposal_interactions`.
 *
 * Tabela criada na Fase 1 do redesign. Captura interações manuais com cliente
 * sobre uma proposta (telefone, reunião, WhatsApp, email, observação interna).
 * Auto-registros (clique no botão WhatsApp da action bar, manifestação de
 * interesse via página pública) também caem aqui com `auto_generated=true`.
 */

export type ProposalInteractionChannel =
  | "whatsapp"
  | "email"
  | "telefone"
  | "reuniao_presencial"
  | "reuniao_video"
  | "observacao";

export type ProposalInteractionDirection =
  | "inbound" // cliente -> Daniel
  | "outbound" // Daniel -> cliente
  | "internal"; // nota interna sem direção definida

export interface ProposalInteraction {
  id: string;
  organization_id: string;
  proposal_id: string;
  channel: ProposalInteractionChannel;
  direction: ProposalInteractionDirection;
  /** Quando a interação efetivamente aconteceu (não confundir com created_at). */
  interaction_at: string;
  summary: string;
  details: string | null;
  recorded_by: string | null;
  auto_generated: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

export const CHANNEL_LABEL: Record<ProposalInteractionChannel, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  telefone: "Telefone",
  reuniao_presencial: "Reunião presencial",
  reuniao_video: "Reunião por vídeo",
  observacao: "Observação",
};

export const DIRECTION_LABEL: Record<ProposalInteractionDirection, string> = {
  inbound: "Cliente enviou",
  outbound: "Daniel enviou",
  internal: "Nota interna",
};
