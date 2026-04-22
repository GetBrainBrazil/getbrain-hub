import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ProjectStatus,
  ProjectType,
  MaintenanceContractStatus,
  getStatusBadgeClass,
  getStatusLabel,
  getTypeBadgeClass,
  getTypeLabel,
  getMaintenanceStatusClass,
  getMaintenanceStatusLabel,
} from "@/lib/projetos-helpers";

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", getStatusBadgeClass(status), className)}>
      {getStatusLabel(status)}
    </Badge>
  );
}

export function TypeBadge({ type, className }: { type: ProjectType; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", getTypeBadgeClass(type), className)}>
      {getTypeLabel(type)}
    </Badge>
  );
}

export function MaintenanceStatusBadge({ status }: { status: MaintenanceContractStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", getMaintenanceStatusClass(status))}>
      {getMaintenanceStatusLabel(status)}
    </Badge>
  );
}
