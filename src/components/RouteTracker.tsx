import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ROUTE_KEY = "getbrain_last_route";

/** Saves the current route (pathname + search) to sessionStorage on every navigation. */
export function RouteTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (pathname !== "/login") {
      sessionStorage.setItem(ROUTE_KEY, pathname + (search || ""));
    }
  }, [pathname, search]);

  return null;
}

export function getLastRoute(): string | null {
  return sessionStorage.getItem(ROUTE_KEY);
}
