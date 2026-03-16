// src/contexts/HideValuesContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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

export function HideValuesProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Lê preferência salva ao montar
  useEffect(() => {
    const saved = localStorage.getItem("hideValues");
    if (saved === "true") setHidden(true);
    setMounted(true);
  }, []);

  const toggle = () => {
    setHidden((prev) => {
      const next = !prev;
      localStorage.setItem("hideValues", String(next));
      return next;
    });
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