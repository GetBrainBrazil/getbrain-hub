import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ROUTE_KEY = "getbrain_last_route";
const PRE_ADMIN_KEY = "getbrain_pre_admin_route";

export function isReturnableRoute(route: string | null): route is string {
  return Boolean(
    route &&
    route !== "/" &&
    !route.startsWith("/admin") &&
    route !== "/perfil" &&
    route !== "/login"
  );
}

/** Saves the current route (pathname + search) to sessionStorage on every navigation. */
export function RouteTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (pathname !== "/login" && !pathname.startsWith("/admin") && pathname !== "/perfil") {
      sessionStorage.setItem(ROUTE_KEY, pathname + (search || ""));
    }
    // Track last non-admin / non-perfil route so the "back" button in Admin works
    if (!pathname.startsWith("/admin") && pathname !== "/perfil" && pathname !== "/login") {
      sessionStorage.setItem(PRE_ADMIN_KEY, pathname + (search || ""));
    }
  }, [pathname, search]);

  return null;
}

export function getLastRoute(): string | null {
  return sessionStorage.getItem(ROUTE_KEY);
}

export function getPreAdminRoute(): string | null {
  const route = sessionStorage.getItem(PRE_ADMIN_KEY);
  return isReturnableRoute(route) ? route : null;
}

export function getAdminExitRoute(): string {
  const preAdminRoute = getPreAdminRoute();
  if (preAdminRoute) return preAdminRoute;

  const lastRoute = getLastRoute();
  return isReturnableRoute(lastRoute) ? lastRoute : "/";
}
