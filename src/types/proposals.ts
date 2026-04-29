import { z } from "zod";
import type { ProposalStatus } from "@/lib/orcamentos/calculateTotal";

export type { ProposalStatus };

export interface ProposalItem {
  id: string;
  proposal_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  order_index: number;
}

export interface Proposal {
  id: string;
  organization_id: string;
  code: string;
  title: string | null;
  template_slug: string;
  template_version: string;
  client_name: string | null;
  client_company_name: string;
  client_logo_url: string | null;
  client_city: string | null;
  status: ProposalStatus;
  expires_at: string | null;
  valid_until: string;
  mockup_url: string | null;
  access_token: string | null;
  access_password_hash: string | null;
  sent_at: string | null;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  considerations: string[];
  maintenance_description: string | null;
  maintenance_monthly_value: number | null;
  implementation_days: number;
  validation_days: number;
  pdf_url: string | null;
  deal_id: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ProposalWithItems = Proposal & { items: ProposalItem[] };

export const proposalSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    client_name: z.string().trim().min(1, "Cliente obrigatório").max(200),
    client_city: z.string().trim().max(200).optional().nullable(),
    template_slug: z.string().min(1).default("inovacao-tecnologica"),
    expires_at: z.string().min(1, "Validade obrigatória"),
    mockup_url: z.string().trim().url("URL inválida").or(z.literal("")).optional().nullable(),
    maintenance_monthly_value: z.number().min(0).nullable().optional(),
    maintenance_description: z.string().max(500).nullable().optional(),
    implementation_days: z.number().int().min(0).max(3650),
    validation_days: z.number().int().min(0).max(365),
    considerations: z.array(z.string()),
    status: z.enum([
      "rascunho",
      "enviada",
      "visualizada",
      "interesse_manifestado",
      "expirada",
      "convertida",
      "recusada",
    ]),
    password: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === "enviada" && (!val.password || val.password.length < 4)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Senha de acesso obrigatória (mín 4 caracteres)",
      });
    }
  });

export type ProposalFormData = z.infer<typeof proposalSchema>;
