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
    <div className="flex bg-gray-50 dark:bg-gray-950">
      {!esconderNavbar && <Sidebar isCollapsed={isCollapsed} />}

      <div
        className="flex-1 min-h-screen transition-all duration-300 bg-white dark:bg-gray-900"
        style={{
          marginLeft: esconderNavbar ? 0 : isCollapsed ? "80px" : "256px",
        }}
      >
        {!esconderNavbar && (
          <TopMenu
            isCollapsed={isCollapsed}
            toggleSidebar={() => setIsCollapsed(!isCollapsed)}
          />
        )}

        <main
          className="p-4 transition-all duration-300"
          style={{
            paddingTop: esconderNavbar ? "0" : "70px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}