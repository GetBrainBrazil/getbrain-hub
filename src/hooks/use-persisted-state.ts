import { useState, useEffect, useRef } from "react";

function readFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) return JSON.parse(saved) as T;
  } catch {
    /* ignore */
  }
  return defaultValue;
}

export function usePersistedState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => readFromStorage(key, defaultValue));
  const lastKeyRef = useRef(key);

  // Quando a chave muda (ex.: troca de aba com filtros independentes), recarrega o valor da nova chave.
  useEffect(() => {
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    setState(readFromStorage(key, defaultValue));
    // defaultValue é estável o suficiente para esse uso (literais simples).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [key, state]);

  return [state, setState];
}
