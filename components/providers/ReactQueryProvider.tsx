// src/providers/ReactQueryProvider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

/**
 * Configuração global do React Query
 */
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Cache por 5 minutos
        staleTime: 5 * 60 * 1000,
        // Mantém cache por 10 minutos
        gcTime: 10 * 60 * 1000,
        // Recarrega ao focar na janela
        refetchOnWindowFocus: true,
        // Não recarrega ao reconectar
        refetchOnReconnect: false,
        // 1 tentativa de retry
        retry: 1,
      },
      mutations: {
        // Não tenta novamente mutations
        retry: false,
      },
    },
  });

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // Cria cliente apenas uma vez por sessão
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools apenas em desenvolvimento */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}