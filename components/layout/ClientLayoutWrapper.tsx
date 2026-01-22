"use client";

import { useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopMenu from "@/components/layout/TopMenu";

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // ========================================
  // ROTAS PÚBLICAS (sem Sidebar e TopMenu)
  // ========================================
  const esconderNavbar =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname === "/contato" ||
    pathname?.startsWith("/auth/") || // Qualquer rota dentro de (auth)
    pathname?.includes("/404") ||
    pathname?.includes("/500");

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ============================================
          SIDEBAR - Modo Overlay (position: fixed)
          ============================================ */}
      {!esconderNavbar && <Sidebar isCollapsed={isCollapsed} />}

      {/* ============================================
          MAIN CONTENT AREA
          ============================================ 
          
          🎯 MUDANÇA PRINCIPAL:
          - Quando sidebar colapsada → ml-0 (espaço liberado!)
          - Quando sidebar expandida → ml-64 (256px)
          
          A sidebar está em position:fixed, então não precisa
          mais reservar espaço quando colapsada.
      */}
      <div
        className={`
          flex-1 flex flex-col min-h-screen
          transition-all duration-300 ease-in-out
          bg-gray-50 dark:bg-gray-950
          
          ${!esconderNavbar 
            ? isCollapsed 
              ? 'md:ml-0'      // ← Colapsada: SEM margin (overlay!)
              : 'md:ml-64'     // ← Expandida: COM margin (sidebar visível)
            : ''               // ← Rotas públicas: sem margin
          }
        `}
      >
        {/* ============================================
            TOP MENU
            ============================================ */}
        {!esconderNavbar && (
          <TopMenu
            isCollapsed={isCollapsed}
            toggleSidebar={() => setIsCollapsed(!isCollapsed)}
          />
        )}

        {/* ============================================
            MAIN CONTENT
            ============================================ */}
        <main
          className={`
            flex-1 p-4 md:p-6
            transition-all duration-300
            ${!esconderNavbar ? 'pt-20 md:pt-24' : 'pt-0'}
          `}
        >
          {children}
        </main>
      </div>
    </div>
  );
}