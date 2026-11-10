import type { TooltipContentProps } from "recharts";

/**
 * Props do tooltip customizado do Recharts. Opcionais porque, em
 * `content={<Tooltip />}`, o Recharts injeta as props ao clonar o elemento.
 */
export type PropsTooltip = Partial<TooltipContentProps<number, string>>;
