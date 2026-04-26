import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Building2, Briefcase, Folder, Calendar } from "lucide-react";
import { formatDateBR } from "@/lib/orcamentos/calculateTotal";
import type { ProposalDetail } from "@/hooks/orcamentos/useProposalDetail";

interface Props {
  proposal: ProposalDetail;
}

export function AbaDetalhes({ proposal }: Props) {
  const p = proposal as any;

  const dates: Array<{ label: string; iso?: string | null }> = [
    { label: "Criada em", iso: p.created_at },
    { label: "Última atualização", iso: p.updated_at },
    { label: "Enviada em", iso: p.sent_at },
    { label: "Aceita em", iso: p.accepted_at },
    { label: "Recusada em", iso: p.rejected_at },
  ];

  return (
    <div className="space-y-3">
      <Card className="p-3 space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Vínculos
        </h3>
        <div className="space-y-1.5 text-sm">
          {p.deal && (
            <DetailRow
              icon={<Briefcase className="h-3.5 w-3.5" />}
              label="Deal"
              link={`/crm/deals/${p.deal.id}`}
              value={`${p.deal.code} · ${p.deal.title}`}
            />
          )}
          {p.company && (
            <DetailRow
              icon={<Building2 className="h-3.5 w-3.5" />}
              label="Empresa"
              link={`/crm/empresas/${p.company.id}`}
              value={p.company.trade_name || p.company.legal_name}
            />
          )}
          {p.project && (
            <DetailRow
              icon={<Folder className="h-3.5 w-3.5" />}
              label="Projeto"
              link={`/projetos/${p.project.id}`}
              value={`${p.project.code} · ${p.project.name}`}
            />
          )}
          {!p.deal && !p.company && !p.project && (
            <p className="text-xs text-muted-foreground italic">
              Nenhum vínculo cadastrado.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-3 space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Datas
        </h3>
        <div className="space-y-1 text-sm">
          {dates.map((d) =>
            d.iso ? (
              <div
                key={d.label}
                className="flex items-center justify-between border-b border-border last:border-b-0 py-1 last:pb-0"
              >
                <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> {d.label}
                </span>
                <span className="tabular-nums text-xs">
                  {d.iso.length > 10
                    ? new Date(d.iso).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : formatDateBR(d.iso)}
                </span>
              </div>
            ) : null
          )}
        </div>
        {p.rejection_reason && (
          <div className="border-t border-border pt-2 text-xs">
            <div className="text-muted-foreground mb-0.5">Motivo da recusa</div>
            <div className="text-foreground">{p.rejection_reason}</div>
          </div>
        )}
      </Card>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  link,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  link: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground text-xs flex items-center gap-1.5">
        {icon} {label}
      </span>
      <Link
        to={link}
        className="text-xs text-primary hover:underline truncate max-w-[200px]"
      >
        {value} →
      </Link>
    </div>
  );
}
