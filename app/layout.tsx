"use client";

import { useState } from "react";
import { Providers } from "./providers";
import { PeriodoProvider } from "@/components/PeriodoContext";
import Sidebar from "@/components/Sidebar";
import TopMenu from "@/components/TopMenu";
import { usePathname } from "next/navigation";

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const esconderNavbar =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/";

  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <html lang="pt-br">
      <body className="flex">
        <Providers>
          <PeriodoProvider>
            {!esconderNavbar && (
              <Sidebar isCollapsed={isCollapsed} />
            )}

            <div
              className="flex-1 min-h-screen transition-all duration-300"
              style={{
                marginLeft: esconderNavbar
                  ? 0
                  : isCollapsed
                  ? "80px"
                  : "256px",
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
          </PeriodoProvider>
        </Providers>
      </body>
    </html>
  );
}