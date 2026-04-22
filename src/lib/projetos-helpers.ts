import { z } from "zod";

export type ProjectStatus =
  | "proposta"
  | "aceito"
  | "em_desenvolvimento"
  | "em_homologacao"
  | "entregue"
  | "em_manutencao"
  | "pausado"
  | "cancelado"
  | "arquivado";

export type ProjectType =
  | "sistema_personalizado"
  | "chatbot"
  | "consultoria"
  | "interno"
  | "outro";

export type ProjectActorRole =
  | "owner"
  | "developer"
  | "designer"
  | "consultant"
  | "support";

export type MaintenanceContractStatus =
  | "active"
  | "paused"
  | "ended"
  | "cancelled";

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "proposta", label: "Proposta" },
  { value: "aceito", label: "Aceito" },
  { value: "em_desenvolvimento", label: "Em Desenvolvimento" },
  { value: "em_homologacao", label: "Em Homologação" },
  { value: "entregue", label: "Entregue" },
  { value: "em_manutencao", label: "Em Manutenção" },
  { value: "pausado", label: "Pausado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "arquivado", label: "Arquivado" },
];

export const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: "sistema_personalizado", label: "Sistema Personalizado" },
  { value: "chatbot", label: "Chatbot" },
  { value: "consultoria", label: "Consultoria" },
  { value: "interno", label: "Interno" },
  { value: "outro", label: "Outro" },
];

export const PROJECT_ACTOR_ROLE_OPTIONS: { value: ProjectActorRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "developer", label: "Desenvolvedor" },
  { value: "designer", label: "Designer" },
  { value: "consultant", label: "Consultor" },
  { value: "support", label: "Suporte" },
];

export const MAINTENANCE_STATUS_OPTIONS: { value: MaintenanceContractStatus; label: string }[] = [
  { value: "active", label: "Ativo" },
  { value: "paused", label: "Pausado" },
  { value: "ended", label: "Encerrado" },
  { value: "cancelled", label: "Cancelado" },
];

export function getStatusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case "proposta":
      return "bg-muted text-muted-foreground border-border";
    case "aceito":
      return "bg-blue-500/15 text-blue-500 border-blue-500/30";
    case "em_desenvolvimento":
      return "bg-accent/15 text-accent border-accent/30";
    case "em_homologacao":
      return "bg-warning/15 text-warning border-warning/30";
    case "entregue":
      return "bg-success/10 text-success border-success/30";
    case "em_manutencao":
      return "bg-success/20 text-success border-success/40";
    case "pausado":
      return "bg-orange-500/15 text-orange-500 border-orange-500/30";
    case "cancelado":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "arquivado":
      return "bg-secondary text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getTypeBadgeClass(type: ProjectType): string {
  switch (type) {
    case "sistema_personalizado":
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "chatbot":
      return "bg-pink-500/15 text-pink-400 border-pink-500/30";
    case "consultoria":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "interno":
      return "bg-muted text-muted-foreground border-border";
    case "outro":
      return "bg-secondary text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getMaintenanceStatusClass(status: MaintenanceContractStatus): string {
  switch (status) {
    case "active":
      return "bg-success/15 text-success border-success/30";
    case "paused":
      return "bg-warning/15 text-warning border-warning/30";
    case "ended":
      return "bg-muted text-muted-foreground border-border";
    case "cancelled":
      return "bg-destructive/15 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function getTypeLabel(type: ProjectType): string {
  return PROJECT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function getRoleLabel(role: ProjectActorRole): string {
  return PROJECT_ACTOR_ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
}

export function getMaintenanceStatusLabel(s: MaintenanceContractStatus): string {
  return MAINTENANCE_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function colorFromString(s: string): string {
  // simple deterministic hue
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h} 60% 45%)`;
}

export function relativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 30) return `há ${Math.floor(diff / 86400)} d`;
  if (diff < 86400 * 365) return `há ${Math.floor(diff / (86400 * 30))} meses`;
  return `há ${Math.floor(diff / (86400 * 365))} anos`;
}

export const GETBRAIN_ORG_ID = "00000000-0000-0000-0000-000000000001";

export const projectFormSchema = z
  .object({
    name: z.string().min(3, "Mínimo 3 caracteres").max(120, "Máximo 120 caracteres"),
    company_id: z.string().uuid("Cliente obrigatório"),
    project_type: z.enum([
      "sistema_personalizado",
      "chatbot",
      "consultoria",
      "interno",
      "outro",
    ]),
    contract_value: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined as any)),
    installments_count: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined as any)),
    start_date: z.string().optional().or(z.literal("")),
    estimated_delivery_date: z.string().optional().or(z.literal("")),
    description: z.string().optional().or(z.literal("")),
  })
  .refine(
    (d) =>
      !d.start_date ||
      !d.estimated_delivery_date ||
      new Date(d.estimated_delivery_date) >= new Date(d.start_date),
    { message: "Entrega estimada deve ser posterior ao início", path: ["estimated_delivery_date"] },
  );

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
