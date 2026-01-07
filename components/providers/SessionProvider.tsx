"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function SessionProvider({ children }: Props) {
  return (
    <NextAuthSessionProvider
      // ✅ Refetch session a cada 5 minutos para manter viva
      refetchInterval={5 * 60}
      
      // ✅ Refetch quando a janela ganha foco
      refetchOnWindowFocus={true}
      
      // ✅ Base path (opcional, já é o padrão)
      basePath="/api/auth"
    >
      {children}
    </NextAuthSessionProvider>
  );
}