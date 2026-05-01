import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Save, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Settings {
  id?: string;
  organization_id: string;
  chat_enabled: boolean;
  generation_enabled: boolean;
  max_messages_per_session: number;
  chat_model: string;
  generation_model: string;
  monthly_budget_usd: number;
  current_month_spend_usd: number;
  notify_on_first_view: boolean;
  notify_on_pdf_download: boolean;
  notify_on_high_engagement: boolean;
  notify_on_manifested_interest: boolean;
}

const CHAT_MODELS = [
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano (mais barato, mais rápido)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (recomendado)" },
  { value: "openai/gpt-5", label: "GPT-5 (premium)" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

const GEN_MODELS = [
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5 (recomendado)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
];

export default function AdminPropostasIaPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Descobrir organization_id do usuário
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();
      const orgId = (profile as any)?.organization_id;
      if (!orgId) {
        toast.error("Organização não encontrada para o usuário.");
        return;
      }

      const { data } = await (supabase as any)
        .from("proposal_ai_settings")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (data) {
        setSettings(data as Settings);
      } else {
        // Default em memória; só persiste no save
        setSettings({
          organization_id: orgId,
          chat_enabled: true,
          generation_enabled: true,
          max_messages_per_session: 20,
          chat_model: "openai/gpt-5-mini",
          generation_model: "openai/gpt-5",
          monthly_budget_usd: 50,
          current_month_spend_usd: 0,
          notify_on_first_view: true,
          notify_on_pdf_download: false,
          notify_on_high_engagement: true,
          notify_on_manifested_interest: true,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const payload = { ...settings };
      delete (payload as any).current_month_spend_usd;

      const { error } = await (supabase as any)
        .from("proposal_ai_settings")
        .upsert(payload, { onConflict: "organization_id" });
      if (error) throw error;
      toast.success("Configurações de IA salvas.");
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const budgetPct = settings.monthly_budget_usd > 0
    ? (Number(settings.current_month_spend_usd) / settings.monthly_budget_usd) * 100
    : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">IA das Propostas</h2>
          <p className="text-sm text-muted-foreground">
            Configura geração de conteúdo, chat público e notificações ao Daniel.
          </p>
        </div>
      </div>

      {/* Budget */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Orçamento mensal de IA</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Limite mensal (USD)</Label>
            <Input
              type="number"
              step="5"
              min="0"
              value={settings.monthly_budget_usd}
              onChange={(e) =>
                setSettings({ ...settings, monthly_budget_usd: Number(e.target.value) })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Gasto este mês</Label>
            <div className="mt-1 h-10 flex items-center font-mono text-sm">
              ${Number(settings.current_month_spend_usd).toFixed(4)}
              <span className="text-muted-foreground ml-2 text-xs">
                ({budgetPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 bg-muted rounded overflow-hidden">
          <div
            className={`h-full ${
              budgetPct > 90
                ? "bg-destructive"
                : budgetPct > 70
                ? "bg-amber-500"
                : "bg-primary"
            }`}
            style={{ width: `${Math.min(budgetPct, 100)}%` }}
          />
        </div>
        {budgetPct > 90 && (
          <div className="mt-3 flex gap-2 text-xs text-destructive items-center">
            <AlertTriangle className="h-3.5 w-3.5" />
            Orçamento quase esgotado. Geração e chat serão bloqueados ao atingir 100%.
          </div>
        )}
      </Card>

      {/* Geração */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">Geração de conteúdo</h3>
        <ToggleRow
          label="Geração habilitada"
          description="Botão '✨ Gerar com IA' no editor de propostas."
          checked={settings.generation_enabled}
          onChange={(v) => setSettings({ ...settings, generation_enabled: v })}
        />
        <div>
          <Label className="text-xs">Modelo para geração</Label>
          <Select
            value={settings.generation_model}
            onValueChange={(v) => setSettings({ ...settings, generation_model: v })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GEN_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Chat */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">Chat público</h3>
        <ToggleRow
          label="Chat habilitado"
          description="Cliente pode tirar dúvidas direto na página da proposta."
          checked={settings.chat_enabled}
          onChange={(v) => setSettings({ ...settings, chat_enabled: v })}
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Mensagens máximas por sessão</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={settings.max_messages_per_session}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  max_messages_per_session: Number(e.target.value),
                })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Modelo para chat</Label>
            <Select
              value={settings.chat_model}
              onValueChange={(v) => setSettings({ ...settings, chat_model: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHAT_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Notificações */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">Notificações ao Daniel</h3>
        <p className="text-xs text-muted-foreground -mt-2">
          Email via Resend e WhatsApp via Z-API (se configurado).
        </p>
        <ToggleRow
          label="Quando cliente abrir a proposta (1ª vez)"
          checked={settings.notify_on_first_view}
          onChange={(v) => setSettings({ ...settings, notify_on_first_view: v })}
        />
        <ToggleRow
          label="Quando cliente baixar o PDF"
          checked={settings.notify_on_pdf_download}
          onChange={(v) => setSettings({ ...settings, notify_on_pdf_download: v })}
        />
        <ToggleRow
          label="Quando houver alto engajamento (chat iniciado)"
          checked={settings.notify_on_high_engagement}
          onChange={(v) => setSettings({ ...settings, notify_on_high_engagement: v })}
        />
        <ToggleRow
          label="Quando cliente clicar em 'Quero avançar'"
          checked={settings.notify_on_manifested_interest}
          onChange={(v) => setSettings({ ...settings, notify_on_manifested_interest: v })}
        />
      </Card>

      <div className="flex justify-end sticky bottom-4">
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
