import * as React from "react";
import { cn } from "@/lib/utils";

type AutoWidthInputProps = Omit<React.ComponentProps<"input">, "size"> & {
  /** Largura mínima em px. Default: 160 */
  minWidth?: number;
  /** Largura máxima — número (px) ou string CSS (ex.: "100%", "640px"). Default: "100%" */
  maxWidth?: number | string;
  /** Folga horizontal extra somada à medição, em px. Default: 28 (paddings + bordas + caret) */
  extraWidth?: number;
};

/**
 * Input que cresce horizontalmente conforme o usuário digita,
 * limitado por minWidth/maxWidth. Mantém o mesmo visual do <Input> shadcn.
 *
 * Mede o texto através de um <span> espelho invisível que herda
 * o mesmo `className` (font-size, font-weight, letter-spacing, etc.).
 */
export const AutoWidthInput = React.forwardRef<HTMLInputElement, AutoWidthInputProps>(
  (
    {
      value,
      placeholder,
      minWidth = 160,
      maxWidth = "100%",
      extraWidth = 28,
      className,
      style,
      ...rest
    },
    ref,
  ) => {
    const mirrorRef = React.useRef<HTMLSpanElement>(null);
    const [measured, setMeasured] = React.useState<number>(minWidth);

    React.useLayoutEffect(() => {
      if (!mirrorRef.current) return;
      const w = mirrorRef.current.offsetWidth;
      setMeasured(Math.max(minWidth, w + extraWidth));
    }, [value, placeholder, minWidth, extraWidth, className]);

    const widthStyle: React.CSSProperties =
      typeof maxWidth === "number"
        ? { width: Math.min(maxWidth, measured) }
        : { width: measured, maxWidth };

    const mirrorText = (() => {
      const v = value == null ? "" : String(value);
      if (v.length > 0) return v;
      return placeholder && placeholder.length > 0 ? placeholder : " ";
    })();

    return (
      <span className="relative inline-block max-w-full align-middle">
        {/* Espelho invisível para medir o texto.
            Herda as classes do input para casar font-size/weight/tracking. */}
        <span
          ref={mirrorRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none invisible absolute left-0 top-0 whitespace-pre",
            "border border-transparent px-0 py-0",
            "text-base md:text-sm",
            className,
          )}
          style={{
            // Anula classes que afetam o tamanho da caixa, mas não a tipografia
            paddingLeft: 0,
            paddingRight: 0,
            borderLeftWidth: 0,
            borderRightWidth: 0,
            width: "auto",
            minWidth: 0,
            maxWidth: "none",
            height: "auto",
          }}
        >
          {mirrorText}
        </span>

        <input
          ref={ref}
          value={value as any}
          placeholder={placeholder}
          className={cn(
            "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          style={{ ...widthStyle, ...style }}
          {...rest}
        />
      </span>
    );
  },
);
AutoWidthInput.displayName = "AutoWidthInput";
