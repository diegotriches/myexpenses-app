"use client";

import { useTheme } from "next-themes";
import { FiMonitor, FiMoon, FiSun } from "react-icons/fi";
import { useMounted } from "@/hooks/useMounted";
import { proximoTema, rotuloAlternarTema } from "@/utils/tema";

// Usa resolvedTheme: com o tema "sistema", `theme` não diz se a tela está clara ou escura.
// Alternar devolve ao tema do sistema quando o destino coincide com ele (utils/tema.ts).
export default function ThemeToggle() {
  const { resolvedTheme, systemTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const escuro = mounted && resolvedTheme === "dark";
  const seguinte = proximoTema(resolvedTheme, systemTheme);
  const rotulo = rotuloAlternarTema(resolvedTheme, systemTheme);

  return (
    <button
      type="button"
      onClick={() => setTheme(seguinte)}
      className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
      aria-label={rotulo}
      title={rotulo}
    >
      {/* Antes de montar, o tema real não é conhecido: reserva o espaço sem ícone */}
      {!mounted ? (
        <span className="block w-5 h-5" />
      ) : seguinte === "system" ? (
        <FiMonitor className="text-blue-100" size={20} />
      ) : escuro ? (
        <FiSun className="text-yellow-300" size={20} />
      ) : (
        <FiMoon className="text-blue-100" size={20} />
      )}
    </button>
  );
}
