// src/hooks/useMediaQuery.ts
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

export function useIsTablet() {
  return useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
}

export function useIsDesktop() {
  return useMediaQuery("(min-width: 1025px)");
}

/**
 * Hook que retorna o breakpoint atual
 */
export function useBreakpoint() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  if (isMobile) return "mobile";
  if (isTablet) return "tablet";
  if (isDesktop) return "desktop";
  return "mobile"; // fallback
}