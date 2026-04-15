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

export function PeriodFilter({ preset, customRange, onPresetChange, onCustomRangeChange }: PeriodFilterProps) {
  const [open, setOpen] = useState(false);

  const displayLabel = useMemo(() => {
    if (preset === "custom" && customRange.start && customRange.end) {
      const s = format(new Date(customRange.start + "T12:00:00"), "dd/MM/yy");
      const e = format(new Date(customRange.end + "T12:00:00"), "dd/MM/yy");
      return `${s} - ${e}`;
    }
    return presetLabels[preset];
  }, [preset, customRange]);

  function handlePreset(p: PeriodPreset) {
    onPresetChange(p);
    if (p !== "custom") setOpen(false);
  }

  const customStartDate = customRange.start ? new Date(customRange.start + "T12:00:00") : undefined;
  const customEndDate = customRange.end ? new Date(customRange.end + "T12:00:00") : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9 px-3 text-sm font-normal border-input">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span>{displayLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Preset list */}
          <div className="border-r border-border p-2 min-w-[160px]">
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

          {/* Custom date pickers */}
          {preset === "custom" && (
            <div className="p-3 space-y-3">
              <div className="flex gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Data Início</p>
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={(date) => {
                      if (date) {
                        onCustomRangeChange({ ...customRange, start: format(date, "yyyy-MM-dd") });
                      }
                    }}
                    className={cn("p-2 pointer-events-auto")}
                    locale={ptBR}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Data Fim</p>
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={(date) => {
                      if (date) {
                        onCustomRangeChange({ ...customRange, end: format(date, "yyyy-MM-dd") });
                      }
                    }}
                    disabled={(date) => customStartDate ? date < customStartDate : false}
                    className={cn("p-2 pointer-events-auto")}
                    locale={ptBR}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setOpen(false)} disabled={!customRange.start || !customRange.end}>
                  Aplicar
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
