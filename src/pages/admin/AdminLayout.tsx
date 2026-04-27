import { ReactNode } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "usuarios", label: "Usuários", path: "/admin/usuarios" },
  { key: "permissoes", label: "Permissões", path: "/admin/permissoes" },
  { key: "agencia", label: "Agência", path: "/admin/agencia" },
  { key: "logs", label: "Logs", path: "/admin/logs" },
] as const;

export default function AdminLayout({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = TABS.find(t => pathname.startsWith(t.path))?.key ?? "usuarios";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 -ml-2 mt-1" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Usuários, permissões, agência e logs.</p>
        </div>
      </div>

      <div className="border-b overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => navigate(t.path)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium rounded-t-md border-b-2 transition-colors min-h-10",
                active === t.key
                  ? "border-primary text-primary bg-card"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div>{children ?? <Outlet />}</div>
    </div>
  );
}
