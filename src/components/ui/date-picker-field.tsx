import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerFieldProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Campo de data com Popover + Calendar (shadcn) e botão "Limpar".
 * Resolve a limitação do <input type="date"> nativo, em que o usuário
 * não conseguia voltar para o estado vazio depois de preencher.
 *
 * value/onChange usam string no formato ISO `YYYY-MM-DD` (ou null).
 */
export function DatePickerField({
  value,
  onChange,
  placeholder = "Selecionar data",
  className,
  disabled,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);

  const parsed = React.useMemo(() => {
    if (!value) return undefined;
    // Garante parsing local sem deslocamento de timezone
    const d = parseISO(value.length > 10 ? value.slice(0, 10) : value);
    return isValid(d) ? d : undefined;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 w-[180px] justify-start text-left font-normal",
            !parsed && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {parsed ? format(parsed, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={parsed}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          initialFocus
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
        <div className="flex items-center justify-between border-t border-border/50 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            <X className="mr-1 h-3 w-3" /> Limpar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setOpen(false)}
          >
            Fechar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
