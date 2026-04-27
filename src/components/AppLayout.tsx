import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  // Ao trocar de rota, garante que nenhum overlay Radix tenha deixado o body
  // travado com pointer-events: none (acontece se um Dialog/Sheet desmonta
  // junto da rota antes do cleanup natural).
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
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
