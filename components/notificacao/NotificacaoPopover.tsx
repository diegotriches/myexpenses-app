// src/components/notificacao/NotificacaoPopover.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import {
  useNotificacoes,
  useMarcarNotificacaoLida,
  useMarcarTodasNotificacoesLidas,
  useVerificarNotificacoes,
} from "@/hooks/useNotificacoes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Notificacao } from "@/types/notificacao";

const severidadeConfig: Record<string, { color: string; bg: string }> = {
  info: { color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
  aviso: { color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950" },
  warning: { color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950" },
  erro: { color: "text-red-500", bg: "bg-red-50 dark:bg-red-950" },
  error: { color: "text-red-500", bg: "bg-red-50 dark:bg-red-950" },
  success: { color: "text-green-500", bg: "bg-green-50 dark:bg-green-950" },
};

const severidadeFallback = { color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-950" };

// Chave usada no sessionStorage para garantir que /verificar
// só é chamado uma vez por sessão de navegação
const SESSION_KEY = "notificacoes_verificadas";

export function NotificacaoPopover() {
  const { data, isLoading } = useNotificacoes(undefined, 10);
  const marcarComoLida = useMarcarNotificacaoLida();
  const marcarTodasLidas = useMarcarTodasNotificacoesLidas();
  const verificarNotificacoes = useVerificarNotificacoes();

  const router = useRouter();
  const [open, setOpen] = useState(false);

  const notificacoes = data?.notificacoes || [];
  const naoLidas = data?.naoLidas || 0;

  // ── Verificação automática ao montar (uma vez por sessão) ─────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Marca imediatamente para evitar chamadas duplas em StrictMode
    sessionStorage.setItem(SESSION_KEY, "1");

    // Dispara em background — não bloqueia UI, erros são silenciosos
    verificarNotificacoes.mutate(undefined, {
      onError: () => {
        // Remove flag para tentar novamente na próxima sessão
        sessionStorage.removeItem(SESSION_KEY);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClickNotificacao = async (notif: Notificacao) => {
    if (!notif.lida) {
      await marcarComoLida.mutateAsync(notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="
            relative
            h-12 w-12 md:h-10 md:w-10
            touch-manipulation
            active:scale-95
            transition-all duration-100
            cursor-pointer
          "
          aria-label={`Notificações${naoLidas > 0 ? ` - ${naoLidas} não lidas` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900"
              aria-hidden="true"
            >
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h3 className="font-semibold">Notificações</h3>
            {naoLidas > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                {naoLidas}
              </span>
            )}
          </div>

          {notificacoes.length > 0 && (
            <div className="flex gap-1">
              {naoLidas > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => marcarTodasLidas.mutate()}
                  disabled={marcarTodasLidas.isPending}
                  className="h-9 w-9 p-0"
                  title="Marcar todas como lidas"
                  aria-label="Marcar todas como lidas"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              )}

            </div>
          )}
        </div>

        {/* Lista */}
        <ScrollArea className="h-[400px]">
          {isLoading && notificacoes.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-600 dark:text-gray-400">
              Carregando...
            </div>
          ) : notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="mb-2 h-12 w-12 text-gray-400 dark:text-gray-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {notificacoes.slice(0, 5).map((notif) => {
                const config = severidadeConfig[notif.severidade] ?? severidadeFallback;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClickNotificacao(notif)}
                    className={cn(
                      "relative cursor-pointer px-4 py-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700",
                      !notif.lida && "bg-blue-50/50 dark:bg-blue-950/20"
                    )}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleClickNotificacao(notif);
                      }
                    }}
                  >
                    {!notif.lida && (
                      <div
                        className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-500"
                        aria-label="Não lida"
                      />
                    )}

                    <div className="ml-3 flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          config.bg
                        )}
                        aria-hidden="true"
                      >
                        <Bell className={cn("h-4 w-4", config.color)} />
                      </div>

                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-sm font-medium leading-tight text-gray-900 dark:text-white">
                          {notif.titulo}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {notif.mensagem}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(notif.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <Separator />
        <div className="p-2 space-y-1">
          {notificacoes.length > 0 && (
            <Button
              variant="ghost"
              className="w-full justify-center text-sm h-10 touch-manipulation active:scale-[0.98] transition-transform"
              onClick={() => {
                router.push("/notificacoes");
                setOpen(false);
              }}
            >
              Ver todas as notificações
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full justify-center text-sm h-10 text-gray-500 dark:text-gray-400 touch-manipulation active:scale-[0.98] transition-transform"
            onClick={() => verificarNotificacoes.mutate()}
            disabled={verificarNotificacoes.isPending}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-2", verificarNotificacoes.isPending && "animate-spin")} />
            {verificarNotificacoes.isPending ? "Verificando..." : "Verificar novas"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}