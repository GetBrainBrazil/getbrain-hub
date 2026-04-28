import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPhoneBR } from "@/lib/formatters";

export const ESTADOS_BR = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export type FormMode = "list" | "view" | "edit" | "new";

/* ─── Masks & formatters ─── */
export function applyCpfCnpjMask(value: string, tipo: "PF" | "PJ") {
  const d = value.replace(/\D/g, "");
  if (tipo === "PF") return d.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return d.slice(0, 14).replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
export function applyCpfMask(v: string) { return applyCpfCnpjMask(v, "PF"); }
export function applyPhoneMask(value: string) {
  // Única fonte de verdade: detecta DDI +55 e formata progressivamente.
  return formatPhoneBR(value);
}
export function applyCepMask(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return d.replace(/(\d{5})(\d{1,3})/, "$1-$2");
}
export function applyMoneyMask(value: string) {
  const d = value.replace(/\D/g, "");
  if (!d) return "0,00";
  const num = parseInt(d, 10) / 100;
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}
export function parseMoney(value: string) {
  return parseFloat(value.replace(/\./g, "").replace(",", "."));
}
export function formatMoneyForInput(n: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
}

/* ─── Bank-specific masks ─── */
export function applyAgenciaMask(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 5);
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)}-${d.slice(4)}`;
}

export function applyContaMask(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 1) return d;
  return `${d.slice(0, -1)}-${d.slice(-1)}`;
}

/* ─── PIX key detection & masking ─── */
export type PixType = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria" | "indefinido";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function detectPixType(value: string): PixType {
  const v = (value || "").trim();
  if (!v) return "indefinido";
  if (v.includes("@")) return "email";
  if (UUID_RE.test(v)) return "aleatoria";
  // Has letters but isn't a UUID → likely a partial random key
  if (/[a-zA-Z]/.test(v)) return v.length >= 20 ? "aleatoria" : "indefinido";
  const d = v.replace(/\D/g, "");
  if (!d) return "indefinido";
  if (d.length === 14) return "cnpj";
  if (d.length === 11) {
    const ddd = parseInt(d.slice(0, 2), 10);
    // Phone: starts with valid DDD (11-99) AND third digit is 9 (mobile)
    if (ddd >= 11 && ddd <= 99 && d[2] === "9") return "telefone";
    return "cpf";
  }
  if (d.length === 10) {
    const ddd = parseInt(d.slice(0, 2), 10);
    if (ddd >= 11 && ddd <= 99) return "telefone";
    return "indefinido";
  }
  return "indefinido";
}

export function pixTypeLabel(t: PixType): string {
  switch (t) {
    case "cpf": return "CPF";
    case "cnpj": return "CNPJ";
    case "email": return "E-mail";
    case "telefone": return "Telefone";
    case "aleatoria": return "Aleatória";
    default: return "—";
  }
}

export function applyPixMask(value: string): string {
  const v = value || "";
  if (!v) return "";
  // Email or contains a non-digit alphabetic char that isn't part of UUID → leave as-is
  if (v.includes("@")) return v.trim();
  // If user typed letters (likely a random key/UUID), keep as-is
  if (/[a-zA-Z]/.test(v)) return v.trim().slice(0, 36);
  // Pure digits path
  const d = v.replace(/\D/g, "");
  if (!d) return "";
  // CNPJ when 14 digits
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  // 11 digits → telefone (mobile pattern) or CPF
  if (d.length === 11) {
    const ddd = parseInt(d.slice(0, 2), 10);
    if (ddd >= 11 && ddd <= 99 && d[2] === "9") {
      return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (d.length === 10) {
    const ddd = parseInt(d.slice(0, 2), 10);
    if (ddd >= 11 && ddd <= 99) {
      return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
  }
  // Progressive partial formatting (assume CPF/phone in progress, no formatting until complete to avoid ambiguity)
  return d.slice(0, 14);
}

export function formatCpfCnpj(value: string | null | undefined, tipo?: string) {
  if (!value) return "—";
  const d = value.replace(/\D/g, "");
  if ((tipo === "PF" || d.length === 11) && d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if ((tipo === "PJ" || d.length === 14) && d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value;
}
export function formatPhone(value: string | null | undefined) {
  if (!value) return "—";
  return formatPhoneBR(value) || "—";
}
export function formatDateBR(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
export function buildAddressString(item: any) {
  const parts: string[] = [];
  if (item.endereco) {
    let line = item.endereco;
    if (item.numero) line += `, ${item.numero}`;
    if (item.complemento) line += `, ${item.complemento}`;
    parts.push(line);
  }
  if (item.bairro) parts.push(item.bairro);
  const cityState = [item.cidade, item.estado].filter(Boolean).join("/");
  if (cityState) parts.push(cityState);
  if (item.cep) parts.push(item.cep);
  return parts.join(" - ");
}

/* ─── Page shell (mimics "Nova Conta a Pagar") ─── */
interface FormPageShellProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  footer: ReactNode;
  children: ReactNode;
}
export function FormPageShell({ title, subtitle, onBack, footer, children }: FormPageShellProps) {
  return (
    <div className="w-full space-y-4 animate-fade-in pb-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="rounded-xl border bg-card shadow-sm p-6 sm:p-8">
        <div className="space-y-7">{children}</div>
        <div className="mt-6 pt-4 border-t flex items-center justify-between gap-2">{footer}</div>
      </div>
    </div>
  );
}

/* ─── Section header w/ icon ─── */
interface FormSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}
export function FormSection({ icon: Icon, title, action, children }: FormSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 border-b pb-1.5">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-[11px] font-bold tracking-wider uppercase text-foreground">{title}</h3>
        </div>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/* ─── Read-only field for view mode ─── */
interface DetailFieldProps {
  label: string;
  value?: ReactNode;
  className?: string;
}
export function DetailField({ label, value, className }: DetailFieldProps) {
  const isEmpty = value === null || value === undefined || value === "" || value === "—";
  return (
    <div className={className}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm font-medium mt-0.5">
        {isEmpty ? <span className="text-muted-foreground">—</span> : value}
      </div>
    </div>
  );
}
