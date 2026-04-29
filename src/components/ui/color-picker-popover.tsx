import * as React from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  SUGGESTED_HEX_PALETTE,
  isValidHex,
  normalizeHex,
  resolveHex,
} from "@/lib/crm/colorUtils";

interface ColorPickerPopoverProps {
  /** Valor atual (HEX ou token legado). */
  value: string | null | undefined;
  /** Disparado quando o usuário commit a cor (mouseup / blur / clique em swatch). */
  onCommit: (hex: string) => void;
  disabled?: boolean;
  /** Tamanho do círculo gatilho (px). */
  size?: number;
  ariaLabel?: string;
  className?: string;
  /** Onde alinhar o popover (default: start). */
  align?: "start" | "center" | "end";
}

/**
 * Picker visual reutilizável: área SV + slider de hue + paleta + input HEX.
 * O gatilho é um círculo da cor atual; o popover só fecha ao clicar fora.
 *
 * - Em tempo real altera a cor localmente (preview).
 * - Persiste via `onCommit` quando o usuário solta o mouse, dá blur no HEX,
 *   clica num swatch, ou fecha o popover.
 */
export function ColorPickerPopover({
  value,
  onCommit,
  disabled,
  size = 24,
  ariaLabel = "Escolher cor",
  className,
  align = "start",
}: ColorPickerPopoverProps) {
  const initialHex = React.useMemo(() => resolveHex(value), [value]);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<string>(initialHex);
  const committedRef = React.useRef<string>(initialHex);

  // Sincroniza quando o valor externo muda (ex: outro lugar editou).
  React.useEffect(() => {
    const hex = resolveHex(value);
    setDraft(hex);
    committedRef.current = hex;
  }, [value]);

  const commit = React.useCallback(
    (hex: string) => {
      const norm = normalizeHex(hex);
      if (!isValidHex(norm)) return;
      if (norm === committedRef.current) return;
      committedRef.current = norm;
      onCommit(norm);
    },
    [onCommit],
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Garante commit se o usuário fechar sem soltar o mouse fora da área.
    if (!next) commit(draft);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "shrink-0 rounded-full border border-border ring-offset-background transition",
            "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
            className,
          )}
          style={{ width: size, height: size, background: draft }}
        />
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-[232px] space-y-3 p-3"
        onMouseUp={() => commit(draft)}
      >
        {/* Picker visual (SV + Hue) */}
        <div className="cpk-wrap">
          <HexColorPicker color={draft} onChange={setDraft} />
        </div>

        {/* Paleta sugerida */}
        <div className="flex flex-wrap items-center gap-1.5">
          {SUGGESTED_HEX_PALETTE.map((hex) => {
            const active = draft.toUpperCase() === hex.toUpperCase();
            return (
              <button
                key={hex}
                type="button"
                onClick={() => {
                  setDraft(hex);
                  commit(hex);
                }}
                title={hex}
                aria-label={`Cor ${hex}`}
                className={cn(
                  "h-5 w-5 rounded-full border transition",
                  active
                    ? "scale-110 border-foreground shadow-sm"
                    : "border-border/60 hover:scale-110",
                )}
                style={{ background: hex }}
              />
            );
          })}
        </div>

        {/* Input HEX + preview */}
        <div className="flex items-center gap-2">
          <span
            className="h-7 w-7 shrink-0 rounded-md border border-border"
            style={{ background: draft }}
          />
          <div className="flex flex-1 items-center rounded-md border border-input bg-background px-2 focus-within:ring-1 focus-within:ring-ring">
            <span className="select-none text-xs text-muted-foreground">#</span>
            <HexColorInput
              color={draft}
              onChange={setDraft}
              onBlur={() => commit(draft)}
              prefixed={false}
              className="h-7 w-full bg-transparent px-1 font-mono text-xs uppercase outline-none"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
