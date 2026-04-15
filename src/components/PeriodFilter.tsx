import { useState, useMemo } from "react";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PeriodPreset = "all" | "today" | "week" | "month" | "year" | "last30" | "custom";

export interface PeriodRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface PeriodFilterProps {
  preset: PeriodPreset;
  customRange: { start: string | null; end: string | null };
  onPresetChange: (preset: PeriodPreset) => void;
  onCustomRangeChange: (range: { start: string | null; end: string | null }) => void;
}

const presetLabels: Record<PeriodPreset, string> = {
  all: "Todo o Período",
  today: "Hoje",
  week: "Esta Semana",
  month: "Este Mês",
  year: "Este Ano",
  last30: "Últimos 30 dias",
  custom: "Personalizado",
};

export function getDateRange(preset: PeriodPreset, customRange: { start: string | null; end: string | null }): PeriodRange {
  const now = new Date();
  switch (preset) {
    case "all":
      return { startDate: null, endDate: null };
    case "today":
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
    case "week":
      return { startDate: startOfWeek(now, { weekStartsOn: 1 }), endDate: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case "year":
      return { startDate: startOfYear(now), endDate: endOfYear(now) };
    case "last30":
      return { startDate: startOfDay(subDays(now, 30)), endDate: endOfDay(now) };
    case "custom":
      return {
        startDate: customRange.start ? new Date(customRange.start + "T00:00:00") : null,
        endDate: customRange.end ? new Date(customRange.end + "T23:59:59") : null,
      };
    default:
      return { startDate: null, endDate: null };
  }
}

function InlineDatePicker({ date, onSelect, placeholder, disabledFn }: {
  date: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  placeholder: string;
  disabledFn?: (d: Date) => boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-3 text-sm font-normal border-input gap-2 min-w-[140px] justify-start",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          {date ? format(date, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          disabled={disabledFn}
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export function PeriodFilter({ preset, customRange, onPresetChange, onCustomRangeChange }: PeriodFilterProps) {
  const [open, setOpen] = useState(false);

  const displayLabel = useMemo(() => {
    return presetLabels[preset];
  }, [preset]);

  function handlePreset(p: PeriodPreset) {
    onPresetChange(p);
    setOpen(false);
  }

  const customStartDate = customRange.start ? new Date(customRange.start + "T12:00:00") : undefined;
  const customEndDate = customRange.end ? new Date(customRange.end + "T12:00:00") : undefined;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-9 px-3 text-sm font-normal border-input">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{displayLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-2 min-w-[160px]">
            {(Object.keys(presetLabels) as PeriodPreset[]).map(p => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className={cn(
                  "w-full text-left text-sm px-3 py-2 rounded-md transition-colors",
                  preset === p ? "bg-accent text-accent-foreground font-medium" : "text-foreground hover:bg-muted"
                )}
              >
                {presetLabels[p]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {preset === "custom" && (
        <>
          <InlineDatePicker
            date={customStartDate}
            onSelect={(d) => {
              if (d) onCustomRangeChange({ ...customRange, start: format(d, "yyyy-MM-dd") });
            }}
            placeholder="dd/mm/aaaa"
          />
          <span className="text-sm text-muted-foreground">a</span>
          <InlineDatePicker
            date={customEndDate}
            onSelect={(d) => {
              if (d) onCustomRangeChange({ ...customRange, end: format(d, "yyyy-MM-dd") });
            }}
            placeholder="dd/mm/aaaa"
            disabledFn={(d) => customStartDate ? d < customStartDate : false}
          />
        </>
      )}
    </div>
  );
}
