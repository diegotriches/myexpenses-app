"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  Info,
  RefreshCw,
  Settings,
  TriangleAlert,
  XCircle,
  type LucideIcon,
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

// Severidade fora destas 4 chaves (ex.: tipo de notificação futuro) cai no cinza neutro
const severidadeConfig: Record<string, { color: string; bg: string; label: string; icone: LucideIcon }> = {
  info:    { color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950",     label: "Informação", icone: Info          },
  warning: { color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950", label: "Aviso",      icone: TriangleAlert },
  error:   { color: "text-red-500",    bg: "bg-red-50 dark:bg-red-950",       label: "Erro",       icone: XCircle       },
  success: { color: "text-green-500",  bg: "bg-green-50 dark:bg-green-950",   label: "Sucesso",    icone: CheckCircle2  },
};
const severidadeFallback = { color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-900", label: "Outro", icone: Bell };

type FiltroStatus = "todas" | "lidas" | "nao-lidas";
const FILTROS_STATUS: readonly string[] = ["todas", "lidas", "nao-lidas"];
const FILTROS_SEVERIDADE: readonly string[] = ["todas", "info", "warning", "error", "success"];

const ehFiltroStatus = (v: string): v is FiltroStatus => FILTROS_STATUS.includes(v);
const ehFiltroSeveridade = (v: string): v is SeveridadeNotificacao | "todas" => FILTROS_SEVERIDADE.includes(v);

// Quantos avisos aparecem de cada vez ("Carregar mais" soma outro bloco)
const POR_PAGINA = 20;

// O cron grava um aviso por backup bem-sucedido (semanal ou diário). Só o mais
// recente fica visível; os anteriores viram uma linha que pode ser expandida.
// O cron grava tipo "backup", que não está em TipoNotificacao; por isso a comparação é por texto.
const ehBackupConcluido = (n: Notificacao) => String(n.tipo) === "backup" && n.severidade === "info";

const formatarData = (d: string | Date) =>
  new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

export default function NotificacoesPage() {
  const { data, isLoading }   = useNotificacoes();
  const marcarComoLida        = useMarcarNotificacaoLida();
  const marcarTodasLidas      = useMarcarTodasNotificacoesLidas();
  const verificarNotificacoes = useVerificarNotificacoes();

  const router = useRouter();

  const [filtroStatus,     setFiltroStatus]     = useState<FiltroStatus>("todas");
  const [filtroSeveridade, setFiltroSeveridade] = useState<SeveridadeNotificacao | "todas">("todas");
  const [quantidade,       setQuantidade]       = useState(POR_PAGINA);
  const [verBackups,       setVerBackups]       = useState(false);

  const notificacoes = data?.notificacoes || [];
  const naoLidas      = data?.naoLidas     || 0;

  const notificacoesFiltradas = notificacoes.filter((n) => {
    if (filtroStatus === "lidas"     && !n.lida) return false;
    if (filtroStatus === "nao-lidas" &&  n.lida) return false;
    if (filtroSeveridade !== "todas" && n.severidade !== filtroSeveridade) return false;
    return true;
  });

  // Backups antigos já lidos saem da lista (os não lidos continuam à vista)
  const backups = notificacoesFiltradas.filter(ehBackupConcluido);
  const idBackupMaisRecente = backups[0]?.id;
  const backupsAgrupados = backups.filter((n) => n.id !== idBackupMaisRecente && n.lida);
  const idsAgrupados = new Set(backupsAgrupados.map((n) => n.id));
  const lista = verBackups ? notificacoesFiltradas : notificacoesFiltradas.filter((n) => !idsAgrupados.has(n.id));
  const visiveis = lista.slice(0, quantidade);
  const restantes = lista.length - visiveis.length;

  const trocarFiltro = (aplicar: () => void) => {
    aplicar();
    setQuantidade(POR_PAGINA);
  };

  const handleClickNotificacao = async (notif: Notificacao) => {
    if (!notif.lida) {
      await marcarComoLida.mutateAsync(notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const renderNotificacao = (notif: Notificacao) => {
    const config = severidadeConfig[notif.severidade] ?? severidadeFallback;
    const Icone = config.icone;
    return (
      <Card
        className={cn(
          "py-0 gap-0 cursor-pointer transition-all hover:shadow-md dark:bg-gray-900 dark:border-gray-800",
          !notif.lida && "border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10"
        )}
        onClick={() => handleClickNotificacao(notif)}
      >
        <div className="flex items-start gap-3 p-3 md:p-4">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", config.bg)} title={config.label}>
            <Icone className={cn("h-4 w-4", config.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className={cn("text-sm text-gray-900 dark:text-white", notif.lida ? "font-medium" : "font-semibold")}>
                {notif.titulo}
              </h3>
              <span className="text-[11px] text-gray-500 whitespace-nowrap">
                {formatarData(notif.createdAt)}
              </span>
            </div>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-0.5">{notif.mensagem}</p>
          </div>

          {!notif.lida && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 -mr-1"
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
  };

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Notificações</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {naoLidas > 0
              ? `${naoLidas} não ${naoLidas === 1 ? "lida" : "lidas"}`
              : "Todas as notificações estão lidas"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => verificarNotificacoes.mutate({})}
            disabled={verificarNotificacoes.isPending}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", verificarNotificacoes.isPending && "animate-spin")} />
            Verificar novas
          </Button>
          <Button
            variant="outline"
            size="sm"
            // Ainda não há aba própria para notificações; Preferências é a mais próxima
            onClick={() => router.push("/ajustes?tab=preferencias")}
            title="Configurações"
          >
            <Settings className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Configurações</span>
          </Button>
        </div>
      </div>

      {/* Filtros + Ações */}
      <Card className="p-3 md:p-4 gap-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Filter className="h-4 w-4 shrink-0 text-gray-600 dark:text-gray-400" />
            <Select value={filtroStatus} onValueChange={(v) => { if (ehFiltroStatus(v)) trocarFiltro(() => setFiltroStatus(v)); }}>
              <SelectTrigger className="w-[125px] sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="nao-lidas">Não lidas</SelectItem>
                <SelectItem value="lidas">Lidas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroSeveridade} onValueChange={(v) => { if (ehFiltroSeveridade(v)) trocarFiltro(() => setFiltroSeveridade(v)); }}>
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
          <>
            {visiveis.map((notif) => (
              <Fragment key={notif.id}>
                {renderNotificacao(notif)}
                {notif.id === idBackupMaisRecente && backupsAgrupados.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setVerBackups((v) => !v)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  >
                    {verBackups ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {verBackups
                      ? "Ocultar backups anteriores"
                      : `${backupsAgrupados.length} ${backupsAgrupados.length === 1 ? "backup anterior concluído" : "backups anteriores concluídos"}`}
                  </button>
                )}
              </Fragment>
            ))}

            {restantes > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setQuantidade((q) => q + POR_PAGINA)}
              >
                Carregar mais ({restantes} {restantes === 1 ? "restante" : "restantes"})
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
