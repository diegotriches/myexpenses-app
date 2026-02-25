// src/app/(protected)/notificacoes/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Filter,
  RefreshCw,
  Settings,
} from "lucide-react";
import {
  useNotificacoes,
  useMarcarNotificacaoLida,
  useMarcarTodasNotificacoesLidas,
  useVerificarNotificacoes,
} from "@/hooks/useNotificacoes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Notificacao, SeveridadeNotificacao } from "@/types/notificacao";

// Configuração de cores e labels por severidade
const severidadeConfig = {
  info:    { color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950",     label: "Informação" },
  warning: { color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950", label: "Aviso"      },
  error:   { color: "text-red-500",    bg: "bg-red-50 dark:bg-red-950",       label: "Erro"       },
  success: { color: "text-green-500",  bg: "bg-green-50 dark:bg-green-950",   label: "Sucesso"    },
};

export default function NotificacoesPage() {
  const { data, isLoading }  = useNotificacoes();
  const marcarComoLida       = useMarcarNotificacaoLida();
  const marcarTodasLidas     = useMarcarTodasNotificacoesLidas();
  const verificarNotificacoes = useVerificarNotificacoes();

  const router = useRouter();

  const [filtroStatus,     setFiltroStatus]     = useState<"todas" | "lidas" | "nao-lidas">("todas");
  const [filtroSeveridade, setFiltroSeveridade] = useState<SeveridadeNotificacao | "todas">("todas");

  const notificacoes = data?.notificacoes || [];
  const naoLidas     = data?.naoLidas     || 0;

  const notificacoesFiltradas = notificacoes.filter((n) => {
    if (filtroStatus === "lidas"     && !n.lida) return false;
    if (filtroStatus === "nao-lidas" &&  n.lida) return false;
    if (filtroSeveridade !== "todas" && n.severidade !== filtroSeveridade) return false;
    return true;
  });

  const handleClickNotificacao = async (notif: Notificacao) => {
    if (!notif.lida) {
      await marcarComoLida.mutateAsync(notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notificações</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {naoLidas > 0
              ? `${naoLidas} não ${naoLidas === 1 ? "lida" : "lidas"}`
              : "Todas as notificações estão lidas"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => verificarNotificacoes.mutate()}
            disabled={verificarNotificacoes.isPending}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", verificarNotificacoes.isPending && "animate-spin")} />
            Verificar novas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/ajustes?tab=preferencias")}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Filtros + Ações */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <Select value={filtroStatus} onValueChange={(v: any) => setFiltroStatus(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="nao-lidas">Não lidas</SelectItem>
                <SelectItem value="lidas">Lidas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroSeveridade} onValueChange={(v: any) => setFiltroSeveridade(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os tipos</SelectItem>
                <SelectItem value="info">Informação</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {naoLidas > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => marcarTodasLidas.mutate()}
              disabled={marcarTodasLidas.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </Card>

      {/* Lista */}
      <div className="space-y-2">
        {isLoading && notificacoes.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">Carregando notificações...</p>
          </Card>
        ) : notificacoesFiltradas.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-600" />
            <p className="text-gray-600 dark:text-gray-400">
              {notificacoes.length === 0
                ? "Você não tem notificações"
                : "Nenhuma notificação encontrada com os filtros aplicados"}
            </p>
          </Card>
        ) : (
          notificacoesFiltradas.map((notif) => {
            const config = severidadeConfig[notif.severidade];
            return (
              <Card
                key={notif.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  !notif.lida && "border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10"
                )}
                onClick={() => handleClickNotificacao(notif)}
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Ícone */}
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", config.bg)}>
                    <Bell className={cn("h-5 w-5", config.color)} />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {notif.titulo}
                      </h3>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                        config.bg, config.color
                      )}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{notif.mensagem}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {new Date(notif.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Ação: apenas marcar como lida */}
                  {!notif.lida && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        marcarComoLida.mutate(notif.id);
                      }}
                      disabled={marcarComoLida.isPending}
                      title="Marcar como lida"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}