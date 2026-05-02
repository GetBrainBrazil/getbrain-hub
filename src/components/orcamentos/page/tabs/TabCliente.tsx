/**
 * Tab "Cliente" — vínculo com CRM (deal) + dados de identidade.
 *
 * - CrmDealLinkPicker: vincula a um deal e oferece importação de dados.
 * - Edição inline no padrão Notion-like (campos sem borda forte, autosave do hook).
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LogoUploader } from "@/components/orcamentos/LogoUploader";
import { Button } from "@/components/ui/button";
import { CrmDealLinkPicker } from "@/components/orcamentos/page/CrmDealLinkPicker";
import type { ScopeItem } from "@/lib/orcamentos/calculateTotal";

interface Props {
  proposalId: string;
  state: {
    title: string;
    clientName: string;
    clientCity: string;
    clientLogoUrl: string | null;
    clientBrandColor: string;
  };
  setField: (field: any, value: any) => void;
  setItems: (items: ScopeItem[]) => void;
  dealClientLink?: { id: string; code: string; title: string; stage?: string } | null;
  onLinkChanged?: () => void;
}

export function TabCliente({
  proposalId,
  state,
  setField,
  setItems,
  dealClientLink,
  onLinkChanged,
}: Props) {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Título da proposta */}
      <section className="space-y-2">
        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Título da proposta
        </Label>
        <Input
          value={state.title}
          onChange={(e) => setField("title", e.target.value)}
          placeholder="Ex: Plataforma de automação para vendas — Fase 1"
          className="h-auto border-0 bg-transparent px-0 py-1 text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/30"
        />
        <p className="text-[11px] text-muted-foreground">
          Aparece no topo da página pública e no PDF.
        </p>
      </section>

      {/* Identidade do cliente */}
      <Card className="p-4 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Identidade do cliente
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">Nome / razão social</Label>
              <Input
                value={state.clientName}
                onChange={(e) => setField("clientName", e.target.value)}
                placeholder="Ex: Acme S.A."
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Cidade</Label>
              <Input
                value={state.clientCity}
                onChange={(e) => setField("clientCity", e.target.value)}
                placeholder="São Paulo, SP"
                className="h-9 mt-1"
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-[11px] text-muted-foreground mb-1.5 block">Logo</Label>
          <LogoUploader
            proposalId={proposalId}
            value={state.clientLogoUrl}
            onChange={(url) => setField("clientLogoUrl", url)}
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            PNG transparente fica melhor sobre fundo escuro do cabeçalho.
          </p>
        </div>
      </Card>

      {/* Cor de marca */}
      <Card className="p-4 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cor de marca <span className="text-muted-foreground/50 normal-case font-normal tracking-normal">(opcional)</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Usada como acento na página pública e no PDF (CTAs, ícones, divisores).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded border border-border flex-shrink-0"
            style={{ background: state.clientBrandColor || "transparent" }}
          />
          <Input
            type="text"
            value={state.clientBrandColor}
            onChange={(e) => setField("clientBrandColor", e.target.value)}
            placeholder="#FF6B35"
            pattern="^#[0-9a-fA-F]{6}$"
            className="h-9 font-mono text-sm flex-1"
          />
          <input
            type="color"
            value={state.clientBrandColor || "#06b6d4"}
            onChange={(e) => setField("clientBrandColor", e.target.value)}
            className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
          />
          {state.clientBrandColor && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setField("clientBrandColor", "")}
            >
              Limpar
            </Button>
          )}
        </div>
      </Card>

      {dealClientLink && (
        <p className="text-[11px] text-muted-foreground">
          Vinculada ao deal{" "}
          <a
            href={`/crm/deals/${dealClientLink.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline font-mono"
          >
            {dealClientLink.code}
          </a>{" "}
          — {dealClientLink.title}
        </p>
      )}
    </div>
  );
}
