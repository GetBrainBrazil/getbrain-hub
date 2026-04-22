import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { colorFromString, getInitials } from "@/lib/projetos-helpers";

interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function ActorAvatar({ name, avatarUrl, size = "sm", className }: Props) {
  const sizeClass = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className={cn(sizeClass, "border-2 border-card", className)}>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback
            className="font-semibold text-white"
            style={{ background: colorFromString(name) }}
          >
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}

export function ActorAvatarStack({
  actors,
  max = 3,
}: {
  actors: { id: string; name: string; avatar_url?: string | null }[];
  max?: number;
}) {
  const visible = actors.slice(0, max);
  const overflow = actors.length - visible.length;
  return (
    <div className="flex -space-x-2">
      {visible.map((a) => (
        <ActorAvatar key={a.id} name={a.name} avatarUrl={a.avatar_url} />
      ))}
      {overflow > 0 && (
        <div className="h-7 w-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-medium text-muted-foreground">
          +{overflow}
        </div>
      )}
    </div>
  );
}
