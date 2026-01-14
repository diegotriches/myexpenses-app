// src/hooks/useMediaQuery.ts
"use client";

import { useEffect, useState } from "react";

/**
 * Hook para detectar breakpoints de forma reativa
 * Uso:
 * const isMobile = useMediaQuery("(max-width: 768px)");
 * const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia(query);
    
    // Define valor inicial
    setMatches(media.matches);

    // Handler para mudanças
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Adiciona listener
    media.addEventListener("change", listener);

    // Cleanup
    return () => media.removeEventListener("change", listener);
  }, [query]);

  // Retorna false durante SSR/hidratação para evitar mismatch
  return mounted ? matches : false;
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