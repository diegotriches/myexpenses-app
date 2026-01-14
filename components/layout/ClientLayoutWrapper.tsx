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

  // Verificar se deve esconder navbar
  const esconderNavbar =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/";

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar - esconde em mobile, mostra em desktop */}
      {!esconderNavbar && <Sidebar isCollapsed={isCollapsed} />}

      {/* Main Content Area */}
      <div
        className={`
          flex-1 flex flex-col min-h-screen
          transition-all duration-300
          bg-gray-50 dark:bg-gray-950
          ${!esconderNavbar && 'md:ml-20 lg:ml-64'}
          ${!esconderNavbar && isCollapsed && 'md:ml-20'}
          ${!esconderNavbar && !isCollapsed && 'md:ml-64'}
        `}
      >
        {/* TopMenu */}
        {!esconderNavbar && (
          <TopMenu
            isCollapsed={isCollapsed}
            toggleSidebar={() => setIsCollapsed(!isCollapsed)}
          />
        )}

        {/* Main Content */}
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