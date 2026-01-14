"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

// ============================================================================
// TIPOS
// ============================================================================

interface Props {
  children: ReactNode;
}

// ============================================================================
// LOADING COMPONENT
// ============================================================================

function SessionLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Carregando sessão...
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// ERROR BOUNDARY FALLBACK
// ============================================================================

function SessionError({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-lg font-semibold">Erro de Autenticação</h2>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ocorreu um erro ao carregar sua sessão. Por favor, tente novamente.
        </p>

        <details className="text-xs text-gray-500 dark:text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
            Detalhes técnicos
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-auto">
            {error.message}
          </pre>
        </details>

        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Recarregar Página
          </button>
          <button
            onClick={() => (window.location.href = "/api/auth/signin")}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
          >
            Fazer Login
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ERROR BOUNDARY CLASS
// ============================================================================

class SessionErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("❌ [SessionProvider] Erro capturado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return <SessionError error={this.state.error} />;
    }

    return this.props.children;
  }
}

// Importar React para o Error Boundary
import React from "react";

// ============================================================================
// SESSION PROVIDER WRAPPER
// ============================================================================

export function SessionProvider({ children }: Props) {
  const [isLoading, setIsLoading] = useState(true);

  // Simular loading inicial (NextAuth já gerencia isso, mas podemos adicionar delay mínimo)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100); // Delay mínimo para evitar flash

    return () => clearTimeout(timer);
  }, []);

  return (
    <SessionErrorBoundary>
      <NextAuthSessionProvider
        // ✅ Refetch session a cada 5 minutos para manter viva
        refetchInterval={5 * 60}
        
        // ✅ Refetch quando a janela ganha foco
        refetchOnWindowFocus={true}
        
        // ✅ Não fazer refetch quando offline (economiza requisições)
        refetchWhenOffline={false}
        
        // ✅ Base path (opcional, já é o padrão)
        basePath="/api/auth"
      >
        {isLoading ? <SessionLoading /> : children}
      </NextAuthSessionProvider>
    </SessionErrorBoundary>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { SessionLoading, SessionError, SessionErrorBoundary };