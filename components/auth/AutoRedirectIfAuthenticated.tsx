"use client";

//
// Componente reutilizável: verifica se existe uma sessão autenticada e,
// se houver, redireciona automaticamente para `redirectTo` (padrão:
// /dashboard) — sem exigir nenhuma ação do usuário.
//
// Três modos de uso (via props):
// - showLoadingOverlay=true  → bloqueia a tela inteira com um spinner
//   enquanto verifica/redireciona (usado no login/register: o usuário
//   está em um fluxo ativo e se beneficia do feedback visual completo).
// - showInlineIndicator=true → não bloqueia nada; renderiza `children`
//   normalmente e mostra um indicador pequeno e discreto (canto da tela)
//   só enquanto `status === "loading"` (usado na landing: dá feedback de
//   que está checando um login salvo, sem interromper a página).
// - Nenhum dos dois (padrão) → renderiza `children` e redireciona
//   silenciosamente por trás, sem nenhum indicador visual.

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

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
  /** Quando true, mostra um indicador pequeno e discreto (canto da tela) enquanto verifica, sem bloquear `children`. Ignorado se showLoadingOverlay for true. */
  showInlineIndicator?: boolean;
  /** Texto exibido ao lado do spinner do indicador discreto. */
  inlineIndicatorMessage?: string;
}

export function AutoRedirectIfAuthenticated({
  children,
  redirectTo = "/dashboard",
  skip = false,
  showLoadingOverlay = false,
  loadingOverlay = null,
  showInlineIndicator = false,
  inlineIndicatorMessage = "Verificando login salvo...",
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

  const mostrarIndicador =
    showInlineIndicator && !skip && status === "loading";

  return (
    <>
      {children}
      {mostrarIndicador && (
        <div
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 animate-in fade-in slide-in-from-bottom-2 duration-300"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span>{inlineIndicatorMessage}</span>
        </div>
      )}
    </>
  );
}