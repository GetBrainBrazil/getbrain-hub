/**
 * Tipos compartilhados pelos painéis da sub-aba Conteúdo.
 */
import type { PublicPageSettings } from "@/lib/publicPageDefaults";

export interface PainelProps {
  settings: PublicPageSettings;
  persist: <K extends keyof PublicPageSettings>(field: K, value: PublicPageSettings[K]) => Promise<any>;
  /** Marca/desmarca um painel como tendo alterações não persistidas (controla o "dot" na sidebar). */
  setDirty?: (dirty: boolean) => void;
}

export interface SecaoMeta {
  id: string;
  group: string;
  label: string;
  description: string;
  icon: string; // lucide name
  /** Palavras-chave usadas pela busca da sidebar. */
  keywords: string[];
}
