import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ROUTE_KEY = "getbrain_last_route";

/** Saves the current route to sessionStorage on every navigation. */
export function RouteTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname !== "/login") {
      sessionStorage.setItem(ROUTE_KEY, pathname);
    }
  }, [pathname]);

  return null;
}

export function getLastRoute(): string | null {
  return sessionStorage.getItem(ROUTE_KEY);
}
