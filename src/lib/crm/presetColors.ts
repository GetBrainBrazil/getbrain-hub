// Mantido por retro-compat. A nova fonte da verdade para utilitários de cor
// dos managers do CRM é `src/lib/crm/colorUtils.ts` (HEX puro).
//
// Re-exporta o sortear de cor aleatória apontando para HEX, para que os hooks
// que ainda chamam `randomPresetColor()` continuem funcionando — mas agora
// devolvendo um HEX vibrante.

import { randomVividHex, resolveHex } from "@/lib/crm/colorUtils";

export function randomPresetColor(): string {
  return randomVividHex();
}

/** @deprecated use `resolveHex` de colorUtils. */
export function colorPreviewFromToken(token: string | null | undefined): string {
  return resolveHex(token);
}
