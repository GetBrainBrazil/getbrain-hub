import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Syncs a piece of state with a URL query parameter using React Router's useSearchParams.
 * - Reads the current value from the URL on every render (always in sync).
 * - On change, updates URL via setSearchParams (replace, no history entry).
 * - When value equals defaultValue (or empty), the param is removed from URL.
 */
export function useURLState<T extends string>(
  paramName: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(paramName);
  const value = (raw !== null ? raw : defaultValue) as T;

  const setValue = useCallback(
    (newValue: T) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (
            newValue === defaultValue ||
            newValue === ("" as T) ||
            newValue === undefined ||
            newValue === null
          ) {
            next.delete(paramName);
          } else {
            next.set(paramName, String(newValue));
          }
          return next;
        },
        { replace: true }
      );
    },
    [paramName, defaultValue, setSearchParams]
  );

  return [value, setValue];
}

/**
 * Boolean variant of useURLState.
 * Stores "1" / "0" — omits param when equal to defaultValue.
 */
export function useURLStateBoolean(
  paramName: string,
  defaultValue: boolean
): [boolean, (value: boolean) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(paramName);
  const value = raw === null ? defaultValue : raw === "1" || raw === "true";

  const setValue = useCallback(
    (newValue: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newValue === defaultValue) {
            next.delete(paramName);
          } else {
            next.set(paramName, newValue ? "1" : "0");
          }
          return next;
        },
        { replace: true }
      );
    },
    [paramName, defaultValue, setSearchParams]
  );

  return [value, setValue];
}
