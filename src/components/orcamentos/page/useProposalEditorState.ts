/**
 * Hook que centraliza TODO o estado de formulário + autosave do editor de
 * proposta. Foi extraído da página `OrcamentoEditarDetalhe.tsx` para que o
 * orquestrador da nova UI (com 9 abas + lazy-mount) possa compartilhar uma
 * única fonte da verdade entre tabs.
 *
 * Princípios:
 *  - Source of truth: este hook. Cada aba consome `state` e chama os setters
 *    via `setField` ou `setItems`.
 *  - Autosave debounced (1.5s) idêntico ao comportamento legado.
 *  - `save({ silent })` força gravação (usado pelo botão Salvar e antes de
 *    ações como Download PDF / Gerar e Enviar).
 *  - `buildPreviewProposal()` compõe o snapshot ao vivo para PDF preview /
 *    geração — reflete edições ainda não salvas.
 *  - O hook NÃO desmonta entre trocas de tab (vive no orquestrador), garantindo
 *    que mudanças feitas em "Cliente" não se percam ao trocar pra "Escopo".
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useProposalDetail } from "@/hooks/orcamentos/useProposalDetail";
import { useUpdateProposal } from "@/hooks/orcamentos/useUpdateProposal";
import {
  useProposalItems,
  useReplaceProposalItems,
} from "@/hooks/orcamentos/useProposalItems";
import type { ScopeItem } from "@/lib/orcamentos/calculateTotal";
import { toast } from "sonner";

/** Snapshot reativo do formulário inteiro. */
export interface ProposalFormState {
  title: string;
  clientName: string;
  clientCity: string;
  clientLogoUrl: string | null;
  scopeItems: ScopeItem[];
  maintenance: number | "";
  maintenanceDesc: string;
  implementationDays: number;
  validationDays: number;
  considerations: string[];
  validUntil: string;
  mockupUrl: string;
  templateKey: string;
  welcomeMessage: string;
  executiveSummary: string;
  painContext: string;
  solutionOverview: string;
  clientBrandColor: string;
  installmentsCount: number | "";
  firstInstallmentDate: string;
  // Investimento e MRR (espelham o CRM)
  implementationValue: number | "";
  mrrStartTrigger: string; // 'on_signature' | 'on_delivery' | 'on_date' | ''
  mrrStartDate: string;
  mrrDurationMonths: number | "";
  mrrDiscountValue: number | "";
  mrrDiscountMonths: number | "";
  // Apresentação na página pública
  investmentLayout: "total_first" | "installments_first";
  showInvestmentBreakdown: boolean;
}

const EMPTY_STATE: ProposalFormState = {
  title: "",
  clientName: "",
  clientCity: "",
  clientLogoUrl: null,
  scopeItems: [],
  maintenance: "",
  maintenanceDesc: "",
  implementationDays: 30,
  validationDays: 7,
  considerations: [],
  validUntil: "",
  mockupUrl: "",
  templateKey: "inovacao_tecnologica",
  welcomeMessage: "",
  executiveSummary: "",
  painContext: "",
  solutionOverview: "",
  clientBrandColor: "",
  installmentsCount: "",
  firstInstallmentDate: "",
  implementationValue: "",
  mrrStartTrigger: "",
  mrrStartDate: "",
  mrrDurationMonths: "",
  mrrDiscountValue: "",
  mrrDiscountMonths: "",
  investmentLayout: "total_first",
  showInvestmentBreakdown: true,
};

const DRAFT_VERSION = 1;
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type ProposalEditorDraft = {
  version: number;
  proposalId: string;
  updatedAt: number;
  state: ProposalFormState;
  itemsDirty: boolean;
};

function draftKey(proposalId: string) {
  return `proposal-editor-draft:${proposalId}`;
}

function readLocalDraft(proposalId: string, dbUpdatedAt?: string | null): ProposalEditorDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(proposalId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as ProposalEditorDraft;
    const dbTime = dbUpdatedAt ? new Date(dbUpdatedAt).getTime() : 0;
    const expired = !draft.updatedAt || Date.now() - draft.updatedAt > DRAFT_TTL_MS;
    const stale = dbTime > 0 && draft.updatedAt <= dbTime;
    if (draft.version !== DRAFT_VERSION || draft.proposalId !== proposalId || expired || stale) {
      window.localStorage.removeItem(draftKey(proposalId));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function writeLocalDraft(proposalId: string, state: ProposalFormState, itemsDirty: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      draftKey(proposalId),
      JSON.stringify({
        version: DRAFT_VERSION,
        proposalId,
        updatedAt: Date.now(),
        state,
        itemsDirty,
      } satisfies ProposalEditorDraft),
    );
  } catch {
    // Sem espaço/permissão no navegador: o autosave em banco continua funcionando.
  }
}

function clearLocalDraft(proposalId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(proposalId));
  } catch {
    // noop
  }
}

/** Adapter ScopeItem (UI legado) ↔ proposal_items canônico */
function canonicalToScopeItems(
  rows: Array<{
    description: string;
    long_description?: string | null;
    unit_price: number | string;
    quantity: number | string;
  }>,
): ScopeItem[] {
  return rows.map((r) => ({
    title: r.description,
    description: r.long_description ?? "",
    value: (Number(r.unit_price) || 0) * (Number(r.quantity) || 1),
  }));
}

export function useProposalEditorState(proposalId: string | undefined) {
  const detail = useProposalDetail(proposalId);
  const itemsQuery = useProposalItems(proposalId);
  const update = useUpdateProposal();
  const replaceItems = useReplaceProposalItems();

  const [state, setState] = useState<ProposalFormState>(EMPTY_STATE);
  const [dirty, setDirty] = useState(false);
  const [itemsDirty, setItemsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const isInitialLoad = useRef(true);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revisionRef = useRef(0);

  // Hidrata estado quando os dados chegam (1ª vez ou ao trocar de proposta).
  useEffect(() => {
    const data = detail.data;
    if (!data) return;
    isInitialLoad.current = true;
    const hydratedState: ProposalFormState = {
      title: (data as any).title || "",
      clientName: data.client_company_name || "",
      clientCity: data.client_city || "",
      clientLogoUrl: data.client_logo_url || null,
      scopeItems: [], // será preenchido pelo efeito de itens canônicos abaixo
      maintenance: data.maintenance_monthly_value
        ? Number(data.maintenance_monthly_value)
        : "",
      maintenanceDesc: data.maintenance_description || "",
      implementationDays: data.implementation_days || 30,
      validationDays: data.validation_days || 7,
      considerations: Array.isArray(data.considerations)
        ? (data.considerations as string[])
        : [],
      validUntil: (data as any).expires_at || data.valid_until || "",
      mockupUrl: (data as any).mockup_url || "",
      templateKey: (data as any).template_key || "inovacao_tecnologica",
      welcomeMessage: (data as any).welcome_message || "",
      executiveSummary: (data as any).executive_summary || "",
      painContext: (data as any).pain_context || "",
      solutionOverview: (data as any).solution_overview || "",
      clientBrandColor: (data as any).client_brand_color || "",
      installmentsCount: (data as any).installments_count
        ? Number((data as any).installments_count)
        : "",
      firstInstallmentDate: (data as any).first_installment_date || "",
      implementationValue:
        (data as any).implementation_value != null
          ? Number((data as any).implementation_value)
          : "",
      mrrStartTrigger: (data as any).mrr_start_trigger || "",
      mrrStartDate: (data as any).mrr_start_date || "",
      mrrDurationMonths: (data as any).mrr_duration_months
        ? Number((data as any).mrr_duration_months)
        : "",
      mrrDiscountValue:
        (data as any).mrr_discount_value != null
          ? Number((data as any).mrr_discount_value)
          : "",
      mrrDiscountMonths: (data as any).mrr_discount_months
        ? Number((data as any).mrr_discount_months)
        : "",
      investmentLayout: ((data as any).investment_layout as any) || "total_first",
      showInvestmentBreakdown:
        (data as any).show_investment_breakdown ?? true,
    };
    const localDraft = readLocalDraft(data.id, data.updated_at);
    setState(localDraft?.state ?? hydratedState);
    setDirty(!!localDraft);
    setItemsDirty(!!localDraft?.itemsDirty);
    setLastSavedAt(data.updated_at ? new Date(data.updated_at) : null);
    // libera o autosave após o ciclo de hidratação
    setTimeout(() => {
      isInitialLoad.current = false;
    }, 0);
  }, [detail.data?.id]);

  // Carrega itens canônicos no estado, sem sobrescrever edição em andamento.
  useEffect(() => {
    const rows = itemsQuery.data;
    if (!rows) return;
    if (itemsDirty) return;
    setState((s) => ({ ...s, scopeItems: canonicalToScopeItems(rows as any) }));
  }, [itemsQuery.data, itemsDirty]);

  useEffect(() => {
    if (isInitialLoad.current || !dirty || !proposalId) return;
    writeLocalDraft(proposalId, state, itemsDirty);
  }, [dirty, itemsDirty, proposalId, state]);

  // Setter genérico — útil pra binding direto em inputs sem boilerplate.
  const setField = useCallback(
    <K extends keyof ProposalFormState>(field: K, value: ProposalFormState[K]) => {
      revisionRef.current += 1;
      setState((s) => {
        const next = { ...s, [field]: value };
        if (proposalId) writeLocalDraft(proposalId, next, itemsDirty);
        return next;
      });
      setDirty(true);
    },
    [itemsDirty, proposalId],
  );

  const setItems = useCallback(
    (next: ScopeItem[]) => {
      revisionRef.current += 1;
      setState((s) => {
        const nextState = { ...s, scopeItems: next };
        if (proposalId) writeLocalDraft(proposalId, nextState, true);
        return nextState;
      });
      setItemsDirty(true);
      setDirty(true);
    },
    [proposalId],
  );

  /**
   * Persiste a proposta. Quando `silent`, omite toast (autosave).
   * `extra` permite incluir campos não-form (ex: status, rejected_at).
   */
  const save = useCallback(
    async (extra: Record<string, any> = {}, opts: { silent?: boolean } = {}) => {
      if (!proposalId) return;
      const saveRevision = revisionRef.current;
      await update.mutateAsync({
        id: proposalId,
        payload: {
          title: state.title.trim() || null,
          client_company_name: state.clientName.trim() || "Cliente",
          client_city: state.clientCity || null,
          client_logo_url: state.clientLogoUrl,
          scope_items: state.scopeItems,
          maintenance_monthly_value:
            typeof state.maintenance === "number" && state.maintenance > 0
              ? state.maintenance
              : null,
          maintenance_description: state.maintenanceDesc || null,
          implementation_days: state.implementationDays,
          validation_days: state.validationDays,
          considerations: state.considerations,
          valid_until: state.validUntil,
          expires_at: state.validUntil || null,
          mockup_url: state.mockupUrl.trim() || null,
          template_key: state.templateKey,
          welcome_message: state.welcomeMessage.trim() || null,
          executive_summary: state.executiveSummary.trim() || null,
          pain_context: state.painContext.trim() || null,
          solution_overview: state.solutionOverview.trim() || null,
          client_brand_color: state.clientBrandColor.trim() || null,
          installments_count:
            typeof state.installmentsCount === "number" && state.installmentsCount > 0
              ? state.installmentsCount
              : null,
          first_installment_date: state.firstInstallmentDate || null,
          implementation_value:
            typeof state.implementationValue === "number" && state.implementationValue >= 0
              ? state.implementationValue
              : null,
          mrr_start_trigger: state.mrrStartTrigger || null,
          mrr_start_date: state.mrrStartDate || null,
          mrr_duration_months:
            typeof state.mrrDurationMonths === "number" && state.mrrDurationMonths > 0
              ? state.mrrDurationMonths
              : null,
          mrr_discount_value:
            typeof state.mrrDiscountValue === "number" && state.mrrDiscountValue > 0
              ? state.mrrDiscountValue
              : null,
          mrr_discount_months:
            typeof state.mrrDiscountMonths === "number" && state.mrrDiscountMonths > 0
              ? state.mrrDiscountMonths
              : null,
          investment_layout: state.investmentLayout || "total_first",
          show_investment_breakdown: !!state.showInvestmentBreakdown,
          ...extra,
        },
      });

      if (itemsDirty) {
        await replaceItems.mutateAsync({
          proposalId,
          items: state.scopeItems.map((it, i) => ({
            description: it.title || "Item",
            long_description: (it.description ?? "").trim() || null,
            quantity: 1,
            unit_price: Number(it.value) || 0,
            order_index: i,
          })),
        });
        if (revisionRef.current === saveRevision) {
          setItemsDirty(false);
        }
      }
      if (revisionRef.current === saveRevision) {
        setDirty(false);
        clearLocalDraft(proposalId);
      }
      setLastSavedAt(new Date());
      if (!opts.silent) toast.success("Salvo");
    },
    [proposalId, state, itemsDirty, update, replaceItems],
  );

  // Autosave debounced (600ms — mais agressivo p/ minimizar perda em recarga).
  useEffect(() => {
    if (isInitialLoad.current || !dirty || !proposalId) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      save({}, { silent: true }).catch(() => {});
    }, 600);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, state]);

  // ----- Guards de saída/recarga -----
  // Mantém referências sempre atualizadas pra usar nos handlers globais
  // sem recriá-los (evita reanexar listeners a cada keystroke).
  const dirtyRef = useRef(dirty);
  const saveRef = useRef(save);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  useEffect(() => { saveRef.current = save; }, [save]);

  useEffect(() => {
    if (!proposalId) return;

    // 1) Avisa antes de sair/recarregar com edições pendentes.
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      // Necessário em alguns navegadores p/ disparar o prompt nativo.
      e.returnValue = "";
    }

    // 2) Flush síncrono quando a aba vai pra background ou está sendo fechada.
    //    `pagehide` é o evento mais confiável pra isso (mais que `unload`).
    function flushIfDirty() {
      if (!dirtyRef.current) return;
      // Cancela o debounce pendente e dispara save imediato.
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      try { saveRef.current({}, { silent: true }); } catch { /* noop */ }
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") flushIfDirty();
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", flushIfDirty);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", flushIfDirty);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [proposalId]);

  /**
   * Snapshot completo da proposta como está agora (banco + edições não salvas).
   * Usado pra render do PDF preview e pra geração definitiva sem aguardar
   * round-trip de save.
   */
  const buildPreviewProposal = useCallback(() => {
    const data = detail.data;
    return {
      id: proposalId,
      code: data?.code,
      title: state.title,
      client_company_name: state.clientName,
      client_logo_url: state.clientLogoUrl,
      client_city: state.clientCity,
      client_brand_color: state.clientBrandColor,
      welcome_message: state.welcomeMessage,
      executive_summary: state.executiveSummary,
      pain_context: state.painContext,
      solution_overview: state.solutionOverview,
      scope_items: state.scopeItems,
      maintenance_monthly_value:
        typeof state.maintenance === "number" && state.maintenance > 0
          ? state.maintenance
          : null,
      maintenance_description: state.maintenanceDesc || null,
      implementation_days: state.implementationDays,
      validation_days: state.validationDays,
      considerations: state.considerations,
      valid_until: state.validUntil,
      mockup_url: state.mockupUrl,
      template_key: state.templateKey,
      installments_count:
        typeof state.installmentsCount === "number" && state.installmentsCount > 0
          ? state.installmentsCount
          : null,
      first_installment_date: state.firstInstallmentDate || null,
      implementation_value:
        typeof state.implementationValue === "number" && state.implementationValue >= 0
          ? state.implementationValue
          : null,
      mrr_start_trigger: state.mrrStartTrigger || null,
      mrr_start_date: state.mrrStartDate || null,
      mrr_duration_months:
        typeof state.mrrDurationMonths === "number" && state.mrrDurationMonths > 0
          ? state.mrrDurationMonths
          : null,
      mrr_discount_value:
        typeof state.mrrDiscountValue === "number" && state.mrrDiscountValue > 0
          ? state.mrrDiscountValue
          : null,
      mrr_discount_months:
        typeof state.mrrDiscountMonths === "number" && state.mrrDiscountMonths > 0
          ? state.mrrDiscountMonths
          : null,
      investment_layout: state.investmentLayout,
      show_investment_breakdown: state.showInvestmentBreakdown,
    };
  }, [detail.data, proposalId, state]);

  return {
    detail,
    state,
    setField,
    setItems,
    dirty,
    itemsDirty,
    isSaving: update.isPending || replaceItems.isPending,
    lastSavedAt,
    save,
    buildPreviewProposal,
  };
}
