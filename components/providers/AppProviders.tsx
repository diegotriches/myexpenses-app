"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { PeriodoProvider } from "@/contexts/PeriodoContext";
import { ClientLayoutWrapper } from "@/components/layout/ClientLayoutWrapper";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        <ToastProvider>
          <PeriodoProvider>
            <ClientLayoutWrapper>
              {children}
            </ClientLayoutWrapper>
            <Toaster />
          </PeriodoProvider>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}