import { useState, ComponentType } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Props {
  Component: ComponentType<{ search: string }>;
  placeholder?: string;
}

/** Wrapper que injeta uma SearchBox controlada local + renderiza a tab. */
export default function FinTabWithSearch({ Component, placeholder = "Buscar…" }: Props) {
  const [search, setSearch] = useState("");
  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="pl-8 h-9"
        />
      </div>
      <Component search={search} />
    </div>
  );
}
