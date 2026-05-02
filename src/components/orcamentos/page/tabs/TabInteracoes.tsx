/**
 * Tab "Interações" — log manual de interações com o cliente sobre a proposta.
 *
 * Inclui:
 *  - Form de registro rápido (canal, direção, data/hora, resumo, detalhes).
 *  - Lista cronológica decrescente, agrupada por dia.
 *  - Filtros por canal e direção.
 *  - Indicador para itens auto-gerados (clique WhatsApp, manifestação
 *    de interesse pelo cliente, etc.).
 *  - Soft delete inline (com confirmação).
 */
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  MessageCircle,
  Mail,
  Phone,
  Users,
  Video,
  StickyNote,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Trash2,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  useProposalInteractions,
  useCreateProposalInteraction,
  useDeleteProposalInteraction,
  type InteractionFilters,
} from "@/hooks/orcamentos/useProposalInteractions";
import {
  CHANNEL_LABEL,
  DIRECTION_LABEL,
  type ProposalInteractionChannel,
  type ProposalInteractionDirection,
} from "@/types/proposalInteractions";

const CHANNEL_ICON: Record<ProposalInteractionChannel, any> = {
  whatsapp: MessageCircle,
  email: Mail,
  telefone: Phone,
  reuniao_presencial: Users,
  reuniao_video: Video,
  observacao: StickyNote,
};

const DIRECTION_ICON: Record<ProposalInteractionDirection, any> = {
  inbound: ArrowDownLeft,
  outbound: ArrowUpRight,
  internal: Lock,
};

interface Props {
  proposalId: string;
}

function nowLocalDatetimeInputValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function groupByDay(rows: any[]): Record<string, any[]> {
  return rows.reduce((acc: Record<string, any[]>, r) => {
    const key = r.interaction_at.slice(0, 10);
    (acc[key] = acc[key] || []).push(r);
    return acc;
  }, {});
}

function formatDayLabel(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TabInteracoes({ proposalId }: Props) {
  const [filters, setFilters] = useState<InteractionFilters>({
    channel: "todos",
    direction: "todos",
  });
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [channel, setChannel] = useState<ProposalInteractionChannel>("whatsapp");
  const [direction, setDirection] = useState<ProposalInteractionDirection>("outbound");
  const [interactionAt, setInteractionAt] = useState<string>(nowLocalDatetimeInputValue());
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");

  const list = useProposalInteractions(proposalId, filters);
  const create = useCreateProposalInteraction();
  const del = useDeleteProposalInteraction();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const grouped = useMemo(() => groupByDay(list.data || []), [list.data]);
  const days = useMemo(() => Object.keys(grouped).sort().reverse(), [grouped]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) {
      toast.error("Descreva brevemente a interação");
      return;
    }
    try {
      await create.mutateAsync({
        proposalId,
        channel,
        direction,
        interactionAt: new Date(interactionAt).toISOString(),
        summary: summary.trim(),
        details: details.trim() || null,
      });
      setSummary("");
      setDetails("");
      setInteractionAt(nowLocalDatetimeInputValue());
      setShowForm(false);
      toast.success("Interação registrada");
    } catch {
      // toast vem do hook
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Remover interação?",
      description: "Esta ação pode ser desfeita restaurando o registro no banco.",
      confirmLabel: "Remover",
      variant: "destructive",
    });
    if (!ok) return;
    await del.mutateAsync({ id, proposalId });
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {confirmDialog}

      {/* Toolbar: filtros + novo */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={filters.channel || "todos"}
          onValueChange={(v) => setFilters({ ...filters, channel: v as any })}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos" className="text-xs">Todos os canais</SelectItem>
            {Object.entries(CHANNEL_LABEL).map(([k, label]) => (
              <SelectItem key={k} value={k} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.direction || "todos"}
          onValueChange={(v) => setFilters({ ...filters, direction: v as any })}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos" className="text-xs">Todas as direções</SelectItem>
            {Object.entries(DIRECTION_LABEL).map(([k, label]) => (
              <SelectItem key={k} value={k} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="h-8 bg-accent hover:bg-accent/90"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Nova interação
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Canal</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_LABEL).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Direção</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DIRECTION_LABEL).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Quando</Label>
                <Input
                  type="datetime-local"
                  value={interactionAt}
                  onChange={(e) => setInteractionAt(e.target.value)}
                  className="h-9 mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Resumo <span className="text-destructive">*</span>
              </Label>
              <Input
                value={summary}
                onChange={(e) => setSummary(e.target.value.slice(0, 200))}
                maxLength={200}
                placeholder="Ex: Cliente confirmou apresentação de quinta-feira"
                className="h-9 mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {summary.length}/200
              </p>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Detalhes (opcional)
              </Label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="Notas adicionais, próximos passos, link da gravação…"
                className="mt-1 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={create.isPending}>
                {create.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                )}
                Registrar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista */}
      {list.isLoading && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
          Carregando interações…
        </div>
      )}

      {!list.isLoading && days.length === 0 && (
        <Card className="p-8 text-center border-dashed space-y-2">
          <MessageCircle className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-foreground">Nenhuma interação registrada ainda.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Registre conversas, reuniões e observações sobre esta proposta.
            Auto-registros (clique no botão WhatsApp, manifestação de interesse pelo
            cliente) também aparecem aqui automaticamente.
          </p>
        </Card>
      )}

      {days.map((day) => (
        <div key={day} className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first-letter:capitalize px-1">
            {formatDayLabel(day)}
          </p>
          <div className="space-y-2">
            {grouped[day].map((it: any) => {
              const ChannelIcon = CHANNEL_ICON[it.channel as ProposalInteractionChannel];
              const DirIcon = DIRECTION_ICON[it.direction as ProposalInteractionDirection];
              return (
                <Card key={it.id} className="p-3 hover:bg-muted/30 transition group">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                      <div className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                        <ChannelIcon className="h-4 w-4" />
                      </div>
                      <DirIcon className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {it.summary}
                        </span>
                        {it.auto_generated && (
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[9px] uppercase tracking-wider border-accent/40 text-accent"
                          >
                            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                            Auto
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {CHANNEL_LABEL[it.channel as ProposalInteractionChannel]} ·{" "}
                        {DIRECTION_LABEL[it.direction as ProposalInteractionDirection]} ·{" "}
                        {formatTime(it.interaction_at)}
                      </p>
                      {it.details && (
                        <p className="text-xs text-foreground/80 mt-1.5 whitespace-pre-wrap">
                          {it.details}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(it.id)}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                      title="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
