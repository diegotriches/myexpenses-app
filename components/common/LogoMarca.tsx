import { useId } from "react";
import { cn } from "@/lib/utils";

interface Props {
  // Lado em px (a logo é quadrada)
  tamanho?: number;
  className?: string;
  // Texto alternativo; vazio quando o nome "MyExpenses" já aparece ao lado
  titulo?: string;
}

/**
 * Logo do app: quadrado com cantos arredondados, degradê azul → violeta,
 * círculo branco e "$". Mesmo desenho do favicon e dos ícones do manifest
 * (public/web-app-manifest-*.png), em SVG para ficar nítida em qualquer
 * tamanho sem baixar imagem. Tem fundo próprio, então funciona nos dois temas;
 * sobre fundos em degradê, passe uma borda clara pelo className
 * (ex.: "ring-1 ring-white/40 shadow-lg").
 */
export function LogoMarca({ tamanho = 36, className, titulo = "" }: Props) {
  const id = useId().replace(/:/g, "");
  const grad = `logo-grad-${id}`;
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 512 512"
      className={cn("shrink-0 rounded-[22%]", className)}
      role={titulo ? "img" : undefined}
      aria-label={titulo || undefined}
      aria-hidden={titulo ? undefined : true}
    >
      <defs>
        <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="512" y2="512">
          <stop offset="0" stopColor="#536DFE" />
          <stop offset="1" stopColor="#6A3DE8" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill={`url(#${grad})`} />
      <circle cx="256" cy="256" r="150" fill="#fff" />
      <g fill="none" stroke={`url(#${grad})`} strokeWidth="27" strokeLinecap="butt" strokeLinejoin="round">
        <path d="M256 150v34M256 330v32" />
        <path d="M300 210C293 192 276 180 254 180C228 180 209 194 209 217C209 241 230 249 256 256C284 264 306 273 306 297C306 320 286 334 257 334C232 334 213 321 206 300" />
      </g>
    </svg>
  );
}
