import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  content: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function HelpTooltip({ content, className, side = "top" }: HelpTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Ajuda"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "inline-flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full",
              className
            )}
          >
            <HelpCircle className="h-4 w-4" strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={6}
          className="max-w-[280px] bg-slate-800 text-white border-slate-700 text-[13px] leading-snug px-3 py-2 rounded-lg shadow-lg"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
