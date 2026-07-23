"use client";

import { useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopMenu from "@/components/layout/TopMenu";
import { HideValuesProvider } from "@/contexts/HideValuesContext";

interface ClientLayoutWrapperProps {
  children: ReactNode;
}

export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    flex-1 flex flex-col min-h-screen w-full max-w-full
    transition-all duration-300 ease-in-out
    bg-gray-50 dark:bg-gray-950
    ${!esconderNavbar ? (isCollapsed ? "md:ml-20" : "md:ml-64") : ""}
  `}
        >
          {!esconderNavbar && (
            <TopMenu
              isCollapsed={isCollapsed}
              toggleSidebar={() => setIsCollapsed(!isCollapsed)}
            />
          )}

          {esconderNavbar ? (
            <div className="flex-1 w-full max-w-full">{children}</div>
          ) : (
            <main
              data-collapsed={isCollapsed ? "true" : "false"}
              className="flex-1 w-full max-w-full p-4 md:p-6 pt-20 md:pt-24 transition-all duration-300"
            >
              {children}
            </main>
          )}
        </div>
      </div>
    </HideValuesProvider>
  );
}
