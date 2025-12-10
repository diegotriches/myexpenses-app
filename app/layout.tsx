"use client";

import { useState } from "react";
import { Providers } from "./providers";
import { PeriodoProvider } from "@/components/PeriodoContext";
import Sidebar from "@/components/Sidebar";
import TopMenu from "@/components/TopMenu";
import { usePathname } from "next/navigation";

import "./globals.css";

const metadata = {
  title: "My Expenses",
  description: "Gerencie suas finanças",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // páginas onde sidebar não aparece
  const esconderNavbar =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/";

  // controla o menu lateral
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <html lang="pt-br">
      <body className="flex">
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
          <PeriodoProvider>
            <Providers>
              <main
                className="p-4 transition-all duration-300"
                style={{
                  paddingTop: esconderNavbar ? "0" : "70px", // espaço do TopMenu
                }}
              >
                {children}
              </main>
            </Providers>
          </PeriodoProvider>
        </div>
      </body>
    </html>
  );
}