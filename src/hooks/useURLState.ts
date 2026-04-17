import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Syncs a piece of state with a URL query parameter.
 * - On mount, reads the value from the URL (or uses defaultValue).
 * - On change, updates URL via history.replaceState (no reload).
 * - When value equals defaultValue, the param is removed from URL.
 */
export function useURLState<T extends string>(
  paramName: string,
  defaultValue: T
): [T, (value: T) => void] {
  const defaultRef = useRef(defaultValue);

  const readFromURL = useCallback((): T => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(paramName);
    if (raw !== null) return raw as T;
    return defaultRef.current;
  }, [paramName]);

  const [state, setStateInternal] = useState<T>(readFromURL);

  const setValue = useCallback(
    (value: T) => {
      setStateInternal(value);
      const params = new URLSearchParams(window.location.search);
      if (value === defaultRef.current || value === "" || value === undefined) {
        params.delete(paramName);
      } else {
        params.set(paramName, String(value));
      }
      const qs = params.toString();
      const newUrl = window.location.pathname + (qs ? `?${qs}` : "");
      window.history.replaceState(null, "", newUrl);
    },
    [paramName]
  );

  return [state, setValue];
}

/**
 * Boolean variant of useURLState.
 * Stores "1" / omits param for false (default) or vice-versa.
 */
export function useURLStateBoolean(
  paramName: string,
  defaultValue: boolean
): [boolean, (value: boolean) => void] {
  const readFromURL = useCallback((): boolean => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(paramName);
    if (raw === null) return defaultValue;
    return raw === "1" || raw === "true";
  }, [paramName, defaultValue]);

  const [state, setStateInternal] = useState<boolean>(readFromURL);

  const setValue = useCallback(
    (value: boolean) => {
      setStateInternal(value);
      const params = new URLSearchParams(window.location.search);
      if (value === defaultValue) {
        params.delete(paramName);
      } else {
        params.set(paramName, value ? "1" : "0");
      }
      const qs = params.toString();
      const newUrl = window.location.pathname + (qs ? `?${qs}` : "");
      window.history.replaceState(null, "", newUrl);
    },
    [paramName, defaultValue]
  );

  return [state, setValue];
}
