// src/components/notificacao/NotificacaoPopover.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { useNotificacoes } from "@/hooks/useNotificacoes";
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

// Mapa de ícones por severidade
const severidadeConfig = {
  info: { color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
  warning: { color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950" },
  error: { color: "text-red-500", bg: "bg-red-50 dark:bg-red-950" },
  success: { color: "text-green-500", bg: "bg-green-50 dark:bg-green-950" },
};

export function NotificacaoPopover() {
  const {
    notificacoes,
    naoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
    remover,
    limparLidas,
  } = useNotificacoes();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleClickNotificacao = async (notif: Notificacao) => {
    // Marca como lida
    if (!notif.lida) {
      await marcarComoLida(notif.id);
    }

    // Navega para o link se existir
    if (notif.link) {
      router.push(notif.link);
      setOpen(false);
    }
  };

  const handleMarcarTodasLidas = async () => {
    try {
      await marcarTodasComoLidas();
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  const handleLimparLidas = async () => {
    try {
      await limparLidas();
    } catch (error) {
      console.error("Erro ao limpar notificações:", error);
    }
  };

  const handleRemover = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await remover(id);
    } catch (error) {
      console.error("Erro ao remover notificação:", error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={8}
      >
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
                  onClick={handleMarcarTodasLidas}
                  className="h-8 px-2"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLimparLidas}
                className="h-8 px-2"
                title="Limpar lidas"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Lista de notificações */}
        <ScrollArea className="h-[400px]">
          {loading && notificacoes.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="mb-2 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notificacoes.map((notif) => {
                const config = severidadeConfig[notif.severidade];
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClickNotificacao(notif)}
                    className={cn(
                      "relative cursor-pointer px-4 py-3 transition-colors hover:bg-accent",
                      !notif.lida && "bg-blue-50/50 dark:bg-blue-950/20"
                    )}
                  >
                    {/* Badge de não lida */}
                    {!notif.lida && (
                      <div className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-500" />
                    )}

                    <div className="ml-3 flex items-start gap-3">
                      {/* Ícone */}
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          config.bg
                        )}
                      >
                        <Bell className={cn("h-4 w-4", config.color)} />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-tight">
                          {notif.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {notif.mensagem}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notif.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      {/* Botão de remover */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => handleRemover(e, notif.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notificacoes.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm"
                onClick={() => {
                  router.push("/notificacoes");
                  setOpen(false);
                }}
              >
                Ver todas as notificações
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}