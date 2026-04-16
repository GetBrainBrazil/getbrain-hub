import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.replace(/(\d{1,2})/, "($1");
  if (d.length <= 7) return d.replace(/(\d{2})(\d{1,5})/, "($1) $2");
  return d.replace(/(\d{2})(\d{5})(\d{1,4})/, "($1) $2-$3");
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

export function formatCpfCnpj(value: string | null | undefined, tipo?: string) {
  if (!value) return "—";
  const d = value.replace(/\D/g, "");
  if ((tipo === "PF" || d.length === 11) && d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if ((tipo === "PJ" || d.length === 14) && d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value;
}
export function formatPhone(value: string | null | undefined) {
  if (!value) return "—";
  const d = value.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return value;
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
    <div className="mx-auto w-full max-w-3xl space-y-4 animate-fade-in pb-6">
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
