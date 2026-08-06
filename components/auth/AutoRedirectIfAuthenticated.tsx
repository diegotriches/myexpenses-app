"use client";

// src/components/auth/AutoRedirectIfAuthenticated.tsx
//
// Componente reutilizável: verifica se existe uma sessão autenticada e,
// se houver, redireciona automaticamente para `redirectTo` (padrão:
// /dashboard) — sem exigir nenhuma ação do usuário.
//
// Dois modos de uso:
// - showLoadingOverlay=true  → bloqueia a tela com um spinner enquanto
//   verifica/redireciona (usado no login: o usuário está em um fluxo
//   ativo e se beneficia do feedback visual de "Redirecionando...").
// - showLoadingOverlay=false (padrão) → renderiza `children` normalmente
//   e só redireciona silenciosamente por trás, se confirmar sessão ativa
//   (usado na landing: evita flash de loading pra quem não está logado,
//   que é a maioria dos visitantes de uma página de marketing).

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface AutoRedirectIfAuthenticatedProps {
  children: ReactNode;
  /** Rota de destino quando uma sessão autenticada é encontrada. */
  redirectTo?: string;
  /** Quando true, pula a checagem/redirecionamento por completo. */
  skip?: boolean;
  /** Quando true, bloqueia `children` com `loadingOverlay` enquanto verifica. */
  showLoadingOverlay?: boolean;
  /** Conteúdo exibido no lugar de `children` enquanto showLoadingOverlay está ativo. */
  loadingOverlay?: ReactNode;
}

export function AutoRedirectIfAuthenticated({
  children,
  redirectTo = "/dashboard",
  skip = false,
  showLoadingOverlay = false,
  loadingOverlay = null,
}: AutoRedirectIfAuthenticatedProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (skip) return;
    if (status === "authenticated" && session?.user) {
      router.replace(redirectTo);
    }
  }, [status, session, skip, redirectTo, router]);

  const bloqueandoTela =
    showLoadingOverlay && !skip && (status === "loading" || status === "authenticated");

  if (bloqueandoTela) {
    return <>{loadingOverlay}</>;
  }

  return <>{children}</>;
}