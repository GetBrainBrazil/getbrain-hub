import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusColor, getStatusLabel, StatusType } from "@/lib/formatters";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium text-xs", getStatusColor(status), className)}
    >
      {getStatusLabel(status)}
    </Badge>
  );
}
