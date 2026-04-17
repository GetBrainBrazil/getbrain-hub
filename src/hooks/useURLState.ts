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
 */
export function useURLState<T extends string>(
  paramName: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();

  // Local state holds the current value. Initialized from URL, then sessionStorage, then default.
  const [localValue, setLocalValue] = useState<T>(() => {
    const urlValue = searchParams.get(paramName);
    if (urlValue !== null) return urlValue as T;
    const stored = readSession(storageKey(pathname, paramName));
    if (stored !== null) {
      // Push back into URL on next tick so refresh works.
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
      return stored as T;
    }
    return defaultValue;
  });

  const setValue = useCallback(
    (newValue: T) => {
      setLocalValue(newValue);
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

  return [localValue, setValue];
}

/** Boolean variant — stores "1" / "0". */
export function useURLStateBoolean(
  paramName: string,
  defaultValue: boolean
): [boolean, (value: boolean) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();

  const [localValue, setLocalValue] = useState<boolean>(() => {
    const urlValue = searchParams.get(paramName);
    if (urlValue !== null) return urlValue === "1" || urlValue === "true";
    const stored = readSession(storageKey(pathname, paramName));
    if (stored !== null) {
      const storedBool = stored === "1" || stored === "true";
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
    return defaultValue;
  });

  const setValue = useCallback(
    (newValue: boolean) => {
      setLocalValue(newValue);
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

  return [localValue, setValue];
}
