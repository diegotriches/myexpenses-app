// src/utils/responsive.ts

/**
 * Breakpoints do Tailwind CSS
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/**
 * Classes Tailwind para responsividade mobile-first
 */
export const responsiveClasses = {
  // Container
  container: "w-full px-4 sm:px-6 lg:px-8",
  
  // Grid responsivo
  gridCols: {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    auto: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  },
  
  // Espaçamento
  spacing: {
    section: "space-y-4 md:space-y-6",
    card: "p-4 md:p-6",
    form: "space-y-3 md:space-y-4",
  },
  
  // Texto
  text: {
    title: "text-2xl md:text-3xl lg:text-4xl",
    subtitle: "text-xl md:text-2xl",
    body: "text-sm md:text-base",
  },
  
  // Modal/Dialog
  dialog: {
    content: "w-full max-w-[95vw] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px]",
    fullscreen: "w-full h-full sm:h-auto sm:max-w-[90vw] md:max-w-4xl",
  },
  
  // Cards
  card: "rounded-lg p-4 md:p-6 shadow-sm",
  
  // Buttons
  button: {
    base: "px-4 py-2 text-sm md:text-base",
    icon: "h-9 w-9 md:h-10 md:w-10",
    full: "w-full sm:w-auto",
  },
} as const;

/**
 * Helper para combinar classes condicionalmente
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Helper para aplicar classes baseadas no breakpoint
 */
export function getResponsiveClass(
  base: string,
  mobile?: string,
  tablet?: string,
  desktop?: string
): string {
  const classes = [base];
  if (mobile) classes.push(`max-md:${mobile}`);
  if (tablet) classes.push(`md:${tablet}`);
  if (desktop) classes.push(`lg:${desktop}`);
  return classes.join(" ");
}