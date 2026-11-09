"use client";

import { createContext, useContext, useSyncExternalStore, ReactNode } from "react";
import { useMounted } from "@/hooks/useMounted";

interface HideValuesContextType {
  hidden: boolean;
  toggle: () => void;
  /** Aplica a máscara se hidden === true */
  mask: (value: string) => string;
}

const HideValuesContext = createContext<HideValuesContextType>({
  hidden: false,
  toggle: () => {},
  mask: (v) => v,
});

const CHAVE_STORAGE = "hideValues";
const ouvintes = new Set<() => void>();

function assinarHidden(aoMudar: () => void) {
  ouvintes.add(aoMudar);
  return () => { ouvintes.delete(aoMudar); };
}

const lerHidden = () => localStorage.getItem(CHAVE_STORAGE) === "true";

export function HideValuesProvider({ children }: { children: ReactNode }) {
  // A preferência salva é a fonte da verdade; no SSR vale false
  const hidden = useSyncExternalStore(assinarHidden, lerHidden, () => false);
  const mounted = useMounted();

  const toggle = () => {
    localStorage.setItem(CHAVE_STORAGE, String(!lerHidden()));
    ouvintes.forEach((avisar) => avisar());
  };

  const mask = (value: string) => (hidden ? "••••••" : value);

  // Evita flash de conteúdo antes de ler o localStorage
  if (!mounted) return <>{children}</>;

  return (
    <HideValuesContext.Provider value={{ hidden, toggle, mask }}>
      {children}
    </HideValuesContext.Provider>
  );
}

export function useHideValues() {
  return useContext(HideValuesContext);
}