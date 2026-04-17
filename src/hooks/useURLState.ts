import { useCallback, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

/** Per-route + param sessionStorage key. */
function storageKey(pathname: string, paramName: string) {
  return `urlstate::${pathname}::${paramName}`;
}

function readSession(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function writeSession(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch { /* ignore */ }
}

/**
 * URL is the source of truth, mirrored to sessionStorage per-route so that
 * navigating away and back restores filters. F5 still works via the URL.
 *
 * Hydration is done synchronously on first render (lazy useState) — no effects,
 * no conditional hooks, no hook-order issues across re-renders.
 */
export function useURLState<T extends string>(
  paramName: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();

  // One-shot hydration: if URL has no param, copy from sessionStorage into URL.
  const [hydrated] = useState(() => {
    const key = storageKey(pathname, paramName);
    const urlValue = searchParams.get(paramName);
    if (urlValue === null) {
      const stored = readSession(key);
      if (stored !== null && stored !== defaultValue) {
        // Defer URL update to avoid setState during render.
        queueMicrotask(() => {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              if (next.get(paramName) === null) next.set(paramName, stored);
              return next;
            },
            { replace: true }
          );
        });
        return stored;
      }
    }
    return urlValue ?? defaultValue;
  });

  const raw = searchParams.get(paramName);
  const value = (raw !== null ? raw : (hydrated as string)) as T;

  const setValue = useCallback(
    (newValue: T) => {
      const key = storageKey(pathname, paramName);
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
    [paramName, defaultValue, setSearchParams, pathname]
  );

  return [value, setValue];
}

/** Boolean variant — stores "1" / "0". */
export function useURLStateBoolean(
  paramName: string,
  defaultValue: boolean
): [boolean, (value: boolean) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();

  const [hydrated] = useState(() => {
    const key = storageKey(pathname, paramName);
    const urlValue = searchParams.get(paramName);
    if (urlValue === null) {
      const stored = readSession(key);
      if (stored !== null) {
        const storedBool = stored === "1" || stored === "true";
        if (storedBool !== defaultValue) {
          queueMicrotask(() => {
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                if (next.get(paramName) === null) next.set(paramName, storedBool ? "1" : "0");
                return next;
              },
              { replace: true }
            );
          });
          return storedBool;
        }
      }
    }
    return urlValue === null ? defaultValue : urlValue === "1" || urlValue === "true";
  });

  const raw = searchParams.get(paramName);
  const value = raw === null ? hydrated : raw === "1" || raw === "true";

  const setValue = useCallback(
    (newValue: boolean) => {
      const key = storageKey(pathname, paramName);
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
    [paramName, defaultValue, setSearchParams, pathname]
  );

  return [value, setValue];
}
