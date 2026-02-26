// src/components/providers/AppProviders.tsx
"use client";

import { ReactNode, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ToastProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { PeriodoProvider } from "@/contexts/PeriodoContext";
import { ClientLayoutWrapper } from "@/components/layout/ClientLayoutWrapper";

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: false,
        retry: 1,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface AppProvidersProps {
  children: ReactNode;
  session: Session | null; // ✅ Recebe sessão do servidor
}

export function AppProviders({ children, session }: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    // ✅ Passa session inicial — NextAuth não precisa fazer fetch no cliente
    <SessionProvider session={session}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <PeriodoProvider>
              <ClientLayoutWrapper>
                {children}
              </ClientLayoutWrapper>
              <Toaster />
              {process.env.NODE_ENV === "development" && (
                <ReactQueryDevtools
                  initialIsOpen={false}
                  position="bottom"
                  buttonPosition="bottom-right"
                />
              )}
            </PeriodoProvider>
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}