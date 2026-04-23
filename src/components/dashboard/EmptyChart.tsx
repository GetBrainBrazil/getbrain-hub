/**
 * EmptyChart — placeholder padronizado para widgets sem dado no escopo.
 */
import { Inbox } from "lucide-react";

interface Props {
  message?: string;
  icon?: React.ReactNode;
}

export function EmptyChart({ message = "Sem dados para o escopo selecionado", icon }: Props) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-1.5 text-muted-foreground">
      {icon ?? <Inbox className="h-5 w-5 opacity-50" />}
      <p className="text-xs">{message}</p>
    </div>
  );
}
