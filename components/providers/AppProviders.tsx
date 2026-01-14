// src/components/providers/AppProviders.tsx
"use client";

import { ReactNode, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ToastProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { PeriodoProvider } from "@/contexts/PeriodoContext";
import { ClientLayoutWrapper } from "@/components/layout/ClientLayoutWrapper";

/**
 * Configuração global do React Query
 */
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Cache por 5 minutos (dados ficam "frescos")
        staleTime: 5 * 60 * 1000,
        // Mantém cache por 10 minutos (garbage collection)
        gcTime: 10 * 60 * 1000,
        // Recarrega dados ao focar na janela
        refetchOnWindowFocus: true,
        // Não recarrega ao reconectar à internet
        refetchOnReconnect: false,
        // Tenta 1 vez em caso de erro
        retry: 1,
      },
      mutations: {
        // Não tenta novamente mutations em caso de erro
        retry: false,
      },
    },
  });

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  // Cria QueryClient apenas uma vez por sessão do navegador
  // Isso garante que o cache seja mantido entre re-renders
  const [queryClient] = useState(createQueryClient);

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        {/* QueryClientProvider deve vir ANTES de hooks que usam React Query */}
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <PeriodoProvider>
              <ClientLayoutWrapper>
                {children}
              </ClientLayoutWrapper>
              
              {/* Toaster global para notificações */}
              <Toaster />
              
              {/* React Query DevTools - apenas em desenvolvimento */}
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