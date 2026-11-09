"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Hook para detectar breakpoints de forma reativa
 * Uso:
 * const isMobile = useMediaQuery("(max-width: 768px)");
 * const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
 */
export function useMediaQuery(query: string): boolean {
  const assinar = useCallback((aoMudar: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", aoMudar);
    return () => media.removeEventListener("change", aoMudar);
  }, [query]);

  // Retorna false durante SSR/hidratação para evitar mismatch
  return useSyncExternalStore(assinar, () => window.matchMedia(query).matches, () => false);
}

/**
 * Hooks pré-configurados para breakpoints comuns
 */
export function useIsMobile() {
  return useMediaQuery("(max-width: 768px)");
}

