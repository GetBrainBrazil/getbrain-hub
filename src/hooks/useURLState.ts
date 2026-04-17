import { useCallback, useEffect, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

/**
 * Builds a sessionStorage key scoped per-route + param name.
 * This way the same param name on different routes won't collide.
 */
function storageKey(pathname: string, paramName: string) {
  return `urlstate::${pathname}::${paramName}`;
}

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/**
 * Syncs a piece of state with a URL query parameter (primary source of truth)
 * AND mirrors it to sessionStorage (per-route) so navigating away and back
 * restores the last filter values, while F5 still works via the URL.
 *
 * Behavior:
 * - On mount: if URL has the param → use it. Else if sessionStorage has a value
 *   for this (route, param) → hydrate URL with it. Else use defaultValue.
 * - On change: writes to URL via setSearchParams (replace) AND to sessionStorage.
 * - When value equals defaultValue (or empty): removes from URL and sessionStorage.
 */
export function useURLState<T extends string>(
  paramName: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const key = storageKey(pathname, paramName);
  const hydratedRef = useRef(false);

  // Hydrate URL from sessionStorage on first mount if URL param is missing.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const urlValue = searchParams.get(paramName);
    if (urlValue === null) {
      const stored = readSession(key);
      if (stored !== null && stored !== defaultValue) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set(paramName, stored);
            return next;
          },
          { replace: true }
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const raw = searchParams.get(paramName);
  const value = (raw !== null ? raw : defaultValue) as T;

  const setValue = useCallback(
    (newValue: T) => {
      const isDefault =
        newValue === defaultValue ||
        newValue === ("" as T) ||
        newValue === undefined ||
        newValue === null;

      writeSession(key, isDefault ? null : String(newValue));

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (isDefault) next.delete(paramName);
          else next.set(paramName, String(newValue));
          return next;
        },
        { replace: true }
      );
    },
    [paramName, defaultValue, setSearchParams, key]
  );

  return [value, setValue];
}

/**
 * Boolean variant of useURLState. Stores "1" / "0".
 * Same URL + sessionStorage mirroring behavior.
 */
export function useURLStateBoolean(
  paramName: string,
  defaultValue: boolean
): [boolean, (value: boolean) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const key = storageKey(pathname, paramName);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const urlValue = searchParams.get(paramName);
    if (urlValue === null) {
      const stored = readSession(key);
      if (stored !== null) {
        const storedBool = stored === "1" || stored === "true";
        if (storedBool !== defaultValue) {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.set(paramName, storedBool ? "1" : "0");
              return next;
            },
            { replace: true }
          );
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const raw = searchParams.get(paramName);
  const value = raw === null ? defaultValue : raw === "1" || raw === "true";

  const setValue = useCallback(
    (newValue: boolean) => {
      const isDefault = newValue === defaultValue;
      writeSession(key, isDefault ? null : newValue ? "1" : "0");

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (isDefault) next.delete(paramName);
          else next.set(paramName, newValue ? "1" : "0");
          return next;
        },
        { replace: true }
      );
    },
    [paramName, defaultValue, setSearchParams, key]
  );

  return [value, setValue];
}
