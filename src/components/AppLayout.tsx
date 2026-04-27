import { ReactNode, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const prevPath = useRef(pathname);

  // Ao mudar de rota, fecha automaticamente qualquer Dialog/Popover/Sheet/Dropdown
  // do Radix que esteja aberto, evitando que overlays modais bloqueiem a navegação
  // pela sidebar quando o usuário esquece um dialog aberto.
  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      // Dispara Escape no documento — todos os primitivos do Radix escutam isso
      // por padrão e fecham. Usamos rAF para rodar após a navegação aplicar.
      requestAnimationFrame(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
      });
    }
  }, [pathname]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <ViewAsBanner />
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
            {/* key={pathname} reseta o boundary ao navegar para outra rota */}
            <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
