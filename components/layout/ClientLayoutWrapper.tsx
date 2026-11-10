"use client";

import { useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopMenu from "@/components/layout/TopMenu";
import { HideValuesProvider } from "@/contexts/HideValuesContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const pathname = usePathname();
  // Entre 768 e 1279 px a barra lateral começa recolhida (aberta, ocupava um terço
  // do tablet); o botão do menu continua abrindo e fechando em qualquer tamanho
  const telaMedia = useMediaQuery("(min-width: 768px) and (max-width: 1279px)");
  const [escolhaUsuario, setEscolhaUsuario] = useState<boolean | null>(null);
  const isCollapsed = escolhaUsuario ?? telaMedia;

  const esconderNavbar =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname === "/contato" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname?.startsWith("/auth/") ||
    pathname?.includes("/404") ||
    pathname?.includes("/500");

  return (
    <HideValuesProvider>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
        {!esconderNavbar && <Sidebar isCollapsed={isCollapsed} />}

        <div
          className={`
    flex-1 flex flex-col min-h-screen w-full max-w-full min-w-0
    transition-all duration-300 ease-in-out
    bg-gray-50 dark:bg-gray-950
    ${!esconderNavbar ? (isCollapsed ? "md:ml-20" : "md:ml-64") : ""}
  `}
        >
          {!esconderNavbar && (
            <TopMenu
              isCollapsed={isCollapsed}
              toggleSidebar={() => setEscolhaUsuario(!isCollapsed)}
            />
          )}

          {esconderNavbar ? (
            <div className="flex-1 w-full max-w-full">{children}</div>
          ) : (
            <main
              data-collapsed={isCollapsed ? "true" : "false"}
              className="flex-1 w-full max-w-full min-w-0 pt-16 md:pt-[4.5rem] pb-6 transition-all duration-300"
            >
              {children}
            </main>
          )}
        </div>
      </div>
    </HideValuesProvider>
  );
}
