import { useEffect, useState } from "react";

export type ViewAsMode =
  | { kind: "none" }
  | { kind: "cargo"; cargoId: string; cargoNome: string; cargoCor?: string }
  | { kind: "user"; userId: string; userNome: string; cargoNome?: string };

const KEY = "view-as-mode";

function read(): ViewAsMode {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { kind: "none" };
    return JSON.parse(raw) as ViewAsMode;
  } catch {
    return { kind: "none" };
  }
}

function write(v: ViewAsMode) {
  if (v.kind === "none") sessionStorage.removeItem(KEY);
  else sessionStorage.setItem(KEY, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent("view-as-changed"));
}

export function useViewAs() {
  const [mode, setMode] = useState<ViewAsMode>(() => read());

  useEffect(() => {
    const handler = () => setMode(read());
    window.addEventListener("view-as-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("view-as-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return {
    mode,
    setViewAs: (v: ViewAsMode) => write(v),
    clear: () => write({ kind: "none" }),
    isActive: mode.kind !== "none",
  };
}
