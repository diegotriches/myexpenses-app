"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Providers } from "./providers";
import { PeriodoProvider } from "@/contexts/PeriodoContext";
import { ToastProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import Sidebar from "@/components/common/Sidebar";
import TopMenu from "@/components/common/TopMenu";

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const esconderNavbar =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/";

  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body className="flex bg-gray-50 dark:bg-gray-950">
        {/* next-themes como provider mais externo */}
        <NextThemesProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem
          disableTransitionOnChange={false}
        >
          <Providers>
            <ToastProvider>
              <PeriodoProvider>
                {!esconderNavbar && (
                  <Sidebar isCollapsed={isCollapsed} />
                )}

                <div
                  className="flex-1 min-h-screen transition-all duration-300 bg-white dark:bg-gray-900"
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

                {/* Toaster - Renderiza os toasts */}
                <Toaster />
              </PeriodoProvider>
            </ToastProvider>
          </Providers>
        </NextThemesProvider>
      </body>
    </html>
  );
}