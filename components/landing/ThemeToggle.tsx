"use client";

import { useTheme } from "next-themes";
import { FiMoon, FiSun } from "react-icons/fi";
import { useMounted } from "@/hooks/useMounted";

// Usa resolvedTheme: com o tema "sistema", `theme` não diz se a tela está clara ou escura
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const escuro = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(escuro ? "light" : "dark")}
      className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
      aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"}
      title={escuro ? "Tema claro" : "Tema escuro"}
    >
      {/* Antes de montar, o tema real não é conhecido: reserva o espaço sem ícone */}
      {!mounted ? (
        <span className="block w-5 h-5" />
      ) : escuro ? (
        <FiSun className="text-yellow-300" size={20} />
      ) : (
        <FiMoon className="text-blue-100" size={20} />
      )}
    </button>
  );
}
