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
  // ✅ REMOVIDO: prop "session" vinda do servidor (RootLayout chamava
  // getSession() incondicionalmente, o que forçava o Next a tratar TODO
  // o app como dinâmico — qualquer página que passasse por esse layout
  // disparava DYNAMIC_SERVER_USAGE no build, mesmo páginas que poderiam
  // ser estáticas (landing, login, termos de uso, etc.)
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    // ✅ CORRIGIDO: sem prop "session" — o SessionProvider busca a sessão
    // via fetch no client (comportamento padrão do NextAuth, GET /api/auth/session).
    // Isso desacopla a leitura de sessão da renderização no servidor: o
    // RootLayout não precisa mais ser async nem chamar getSession(), então
    // páginas que não dependem de dados de sessão no servidor voltam a
    // poder ser pré-renderizadas estaticamente.
    //
    // Tradeoff: há um pequeno delay (um fetch extra) antes da sessão
    // estar disponível no client, comparado a vir pré-carregada do
    // servidor. Na prática é imperceptível e os hooks que dependem de
    // sessão (useSession) já lidam com o estado de loading.
    <SessionProvider>
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