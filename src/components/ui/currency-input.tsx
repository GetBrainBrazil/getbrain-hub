import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Input com máscara monetária BRL.
 * - Valor exibido sempre formatado: "12.750,00", "R$" opcional via prefix.
 * - `value` é uma string numérica em formato "ponto-decimal" (ex.: "12750.00")
 *   para facilitar persistência. Use "" para vazio.
 * - `onValueChange(rawNumberString)` é chamado com a string numérica
 *   ("" quando vazio) para você guardar no estado/draft.
 */
export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onValueChange: (raw: string) => void;
  /** mostra "R$ " antes do número */
  withPrefix?: boolean;
  /** numero de casas decimais (default 2) */
  decimals?: number;
}

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function rawToDigits(raw: string, decimals: number): string {
  if (!raw) return "";
  // raw é tipo "12750.5" → centavos como string sem pontuação
  const num = Number(raw);
  if (Number.isNaN(num)) return "";
  const cents = Math.round(num * Math.pow(10, decimals));
  return String(cents);
}

function digitsToRaw(digits: string, decimals: number): string {
  if (!digits) return "";
  const padded = digits.padStart(decimals + 1, "0");
  const intPart = padded.slice(0, padded.length - decimals);
  const decPart = padded.slice(padded.length - decimals);
  // remove zeros à esquerda do inteiro mas mantém ao menos um
  const intClean = intPart.replace(/^0+(?=\d)/, "");
  return decimals > 0 ? `${intClean}.${decPart}` : intClean;
}

function formatDigits(digits: string, decimals: number): string {
  if (!digits) return "";
  const padded = digits.padStart(decimals + 1, "0");
  const intPart = padded.slice(0, padded.length - decimals);
  const decPart = padded.slice(padded.length - decimals);
  const intClean = intPart.replace(/^0+(?=\d)/, "");
  const intWithSep = intClean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimals > 0 ? `${intWithSep},${decPart}` : intWithSep;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, withPrefix = true, decimals = 2, className, ...rest }, ref) => {
    const digits = rawToDigits(value, decimals);
    const display = digits ? (withPrefix ? `R$ ${formatDigits(digits, decimals)}` : formatDigits(digits, decimals)) : "";

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const newDigits = onlyDigits(e.target.value);
      onValueChange(digitsToRaw(newDigits, decimals));
    }

    return (
      <Input
        ref={ref}
        {...rest}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        className={cn("text-right font-mono tabular-nums", className)}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

/**
 * Input para inteiros com separador de milhar (ex.: parcelas, meses).
 * `value` é string sem pontuação ("12"). Vazio = "".
 */
export interface IntegerInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onValueChange: (raw: string) => void;
  /** se true, formata com separador de milhar */
  withSeparator?: boolean;
}

export const IntegerInput = React.forwardRef<HTMLInputElement, IntegerInputProps>(
  ({ value, onValueChange, withSeparator = true, className, ...rest }, ref) => {
    const digits = onlyDigits(value);
    const display = digits
      ? withSeparator
        ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
        : digits
      : "";

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      onValueChange(onlyDigits(e.target.value));
    }

    return (
      <Input
        ref={ref}
        {...rest}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        className={cn("text-right font-mono tabular-nums", className)}
      />
    );
  },
);
IntegerInput.displayName = "IntegerInput";

/**
 * Input para porcentagem com sufixo "%". 0–100 com até 2 decimais.
 * `value` é string numérica ("10" ou "10.5"). Vazio = "".
 */
export interface PercentInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onValueChange: (raw: string) => void;
  decimals?: number;
}

export const PercentInput = React.forwardRef<HTMLInputElement, PercentInputProps>(
  ({ value, onValueChange, decimals = 2, className, ...rest }, ref) => {
    const digits = rawToDigits(value, decimals);
    // limita a 100%
    let display = "";
    if (digits) {
      const num = Number(digitsToRaw(digits, decimals));
      const capped = num > 100 ? 100 : num;
      display = `${formatDigits(rawToDigits(String(capped), decimals), decimals)} %`;
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const newDigits = onlyDigits(e.target.value);
      const raw = digitsToRaw(newDigits, decimals);
      const num = Number(raw);
      if (num > 100) {
        onValueChange("100");
      } else {
        onValueChange(raw);
      }
    }

    return (
      <Input
        ref={ref}
        {...rest}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        className={cn("text-right font-mono tabular-nums", className)}
      />
    );
  },
);
PercentInput.displayName = "PercentInput";
