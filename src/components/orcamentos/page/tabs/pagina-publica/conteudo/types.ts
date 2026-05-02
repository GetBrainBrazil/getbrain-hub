/**
 * Tipos compartilhados pelos painéis da sub-aba Conteúdo.
 */
import type { PublicPageSettings } from "@/lib/publicPageDefaults";

export interface PainelProps {
  settings: PublicPageSettings;
  persist: <K extends keyof PublicPageSettings>(field: K, value: PublicPageSettings[K]) => Promise<any>;
  setDirty?: (dirty: boolean) => void;
}

/** Props comuns dos painéis "Esta proposta". */
export interface PainelPropostaProps {
  state: any; // ProposalFormState
  setField: (field: any, value: any) => void;
  /** Aplica patch live no iframe enquanto o usuário digita. */
  livePatch: (patch: Record<string, any>) => void;
  setDirty?: (dirty: boolean) => void;
}

export interface SecaoMeta {
  id: string;
  group: string;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
}
