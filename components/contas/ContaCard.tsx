"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Conta } from "@/types/conta";
import { 
  Pencil, 
  Trash2, 
  FileText, 
  Repeat, 
  TrendingUp, 
  TrendingDown,
  MoreVertical,
  Power,
  PowerOff,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useMoeda } from "@/hooks/useMoeda";

interface Props {
  conta: Conta;
  onEditar?: (conta: Conta) => void;
  onExcluir?: (conta: Conta) => void;
  onExtrato?: (conta: Conta) => void;
  onTransferir: (contaOrigemId: string) => void;
  onToggleAtivo?: (conta: Conta) => void;
  onAjustarSaldo?: (conta: Conta) => void;
}

// Identificador de cada botão desktop
type BotaoAtivo = "ajustar" | "extrato" | "transferir" | null;

export default function ContaCard({
  conta,
  onEditar,
  onExcluir,
  onExtrato,
  onTransferir,
  onToggleAtivo,
  onAjustarSaldo,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  // ✅ NOVO: qual botão está em hover (desktop)
  const [botaoHover, setBotaoHover] = useState<BotaoAtivo>(null);

  const bancoImagem = conta.banco
    ? `/contas/${conta.banco.toLowerCase()}.png`
    : null;

  const fmt = useMoeda();

  const getCorSaldo = () => {
    if (conta.saldoAtual > 0) return "text-green-600 dark:text-green-400";
    if (conta.saldoAtual < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const IconeSaldo = conta.saldoAtual >= 0 ? TrendingUp : TrendingDown;

  // ─── Helpers para classes dos botões desktop ──────────────────────────────
  //
  // Regra:
  //   • Nenhum hover → todos os botões com flex-1 (iguais)
  //   • Hover num botão → ele expande (flex: 2 + mostra texto), os outros encolhem (flex: 0 → largura mínima)
  //
  // Usamos inline styles para controlar `flex` dinamicamente, pois classes
  // Tailwind com valores arbitrários dinâmicos não são purged corretamente.

  function getFlexStyle(id: BotaoAtivo): React.CSSProperties {
    if (botaoHover === null) return { flex: 1 };
    if (botaoHover === id)   return { flex: 2 };
    return { flex: 0, minWidth: 0, overflow: "hidden" };
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Cabeçalho */}
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="flex items-center gap-3 flex-1">
          {bancoImagem && (
            <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center p-1.5">
              <img src={bancoImagem} alt={conta.banco ?? "Banco"} className="w-full h-full object-contain" />
            </div>
          )}
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-base leading-tight text-gray-900 dark:text-white">
                {conta.nome}
              </span>
              <Badge
                variant={conta.ativo ? "default" : "secondary"}
                className={conta.ativo
                  ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/30"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                }
              >
                {conta.ativo ? "Ativa" : "Inativa"}
              </Badge>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{conta.banco || "Conta"}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700">
              <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 dark:bg-gray-800 dark:border-gray-700">
            {onEditar && (
              <DropdownMenuItem onClick={() => onEditar(conta)} className="cursor-pointer dark:hover:bg-gray-700">
                <Pencil size={14} className="mr-2" />
                Editar conta
              </DropdownMenuItem>
            )}
            {onToggleAtivo && (
              <DropdownMenuItem onClick={() => onToggleAtivo(conta)} className="cursor-pointer dark:hover:bg-gray-700">
                {conta.ativo ? (
                  <><PowerOff size={14} className="mr-2" />Desativar</>
                ) : (
                  <><Power size={14} className="mr-2" />Ativar</>
                )}
              </DropdownMenuItem>
            )}
            {onExcluir && (
              <>
                <DropdownMenuSeparator className="dark:bg-gray-700" />
                <DropdownMenuItem
                  onClick={() => onExcluir(conta)}
                  className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 dark:hover:bg-gray-700"
                >
                  <Trash2 size={14} className="mr-2" />
                  Remover
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Saldo */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
              Saldo Atual
            </span>
            <IconeSaldo size={16} className={getCorSaldo()} />
          </div>
          <div className={`text-2xl font-bold ${getCorSaldo()}`}>
            {fmt(conta.saldoAtual)}
          </div>
        </div>

        {/* Instituição */}
        <div className="flex items-center justify-between text-sm pb-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400">Instituição</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {conta.banco || "Não informado"}
          </span>
        </div>

        {/* ✅ Botões Desktop — hover expansivo */}
        <div
          className="hidden md:flex items-center gap-2 w-full"
          onMouseLeave={() => setBotaoHover(null)}
        >
          {onAjustarSaldo && (
            <button
              onClick={() => onAjustarSaldo(conta)}
              onMouseEnter={() => setBotaoHover("ajustar")}
              style={getFlexStyle("ajustar")}
              className={[
                // Base
                "flex items-center justify-center gap-2 h-10 rounded-md border text-sm font-medium",
                "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 text-blue-700",
                "hover:from-blue-100 hover:to-blue-200 hover:text-blue-800",
                "dark:from-blue-950/30 dark:to-blue-900/30 dark:border-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
                "transition-all duration-300 ease-in-out shadow-sm hover:shadow-md overflow-hidden whitespace-nowrap",
              ].join(" ")}
            >
              <DollarSign size={18} className="flex-shrink-0" />
              {botaoHover === "ajustar" && (
                <span className="truncate">Ajustar Saldo</span>
              )}
            </button>
          )}

          {onExtrato && (
            <button
              onClick={() => onExtrato(conta)}
              onMouseEnter={() => setBotaoHover("extrato")}
              style={getFlexStyle("extrato")}
              className={[
                "flex items-center justify-center gap-2 h-10 rounded-md border text-sm font-medium",
                "bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 text-purple-700",
                "hover:from-purple-100 hover:to-purple-200 hover:text-purple-800",
                "dark:from-purple-950/30 dark:to-purple-900/30 dark:border-purple-800 dark:text-purple-400 dark:hover:text-purple-300",
                "transition-all duration-300 ease-in-out shadow-sm hover:shadow-md overflow-hidden whitespace-nowrap",
              ].join(" ")}
            >
              <FileText size={18} className="flex-shrink-0" />
              {botaoHover === "extrato" && (
                <span className="truncate">Ver Extrato</span>
              )}
            </button>
          )}

          {onTransferir && (
            <button
              onClick={() => onTransferir(conta.id)}
              onMouseEnter={() => setBotaoHover("transferir")}
              style={getFlexStyle("transferir")}
              className={[
                "flex items-center justify-center gap-2 h-10 rounded-md border text-sm font-medium",
                "bg-gradient-to-r from-green-50 to-green-100 border-green-200 text-green-700",
                "hover:from-green-100 hover:to-green-200 hover:text-green-800",
                "dark:from-green-950/30 dark:to-green-900/30 dark:border-green-800 dark:text-green-400 dark:hover:text-green-300",
                "transition-all duration-300 ease-in-out shadow-sm hover:shadow-md overflow-hidden whitespace-nowrap",
              ].join(" ")}
            >
              <Repeat size={18} className="flex-shrink-0" />
              {botaoHover === "transferir" && (
                <span className="truncate">Nova Transferência</span>
              )}
            </button>
          )}
        </div>

        {/* Botões Mobile — inalterados */}
        <Collapsible open={menuOpen} onOpenChange={setMenuOpen} className="md:hidden">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full flex items-center justify-between">
              <span className="text-sm font-medium">Mais Opções</span>
              {menuOpen ? <ChevronUp size={16} className="ml-2" /> : <ChevronDown size={16} className="ml-2" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {onAjustarSaldo && (
              <Button
                variant="outline" size="sm"
                onClick={() => { onAjustarSaldo(conta); setMenuOpen(false); }}
                className="w-full justify-start bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-blue-200 text-blue-700 dark:from-blue-950/30 dark:to-blue-900/30 dark:border-blue-800 dark:text-blue-400"
              >
                <DollarSign size={16} className="mr-2" />
                Ajustar Saldo
              </Button>
            )}
            {onExtrato && (
              <Button
                variant="outline" size="sm"
                onClick={() => { onExtrato(conta); setMenuOpen(false); }}
                className="w-full justify-start bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-purple-200 text-purple-700 dark:from-purple-950/30 dark:to-purple-900/30 dark:border-purple-800 dark:text-purple-400"
              >
                <FileText size={16} className="mr-2" />
                Ver Extrato
              </Button>
            )}
            {onTransferir && (
              <Button
                variant="outline" size="sm"
                onClick={() => { onTransferir(conta.id); setMenuOpen(false); }}
                className="w-full justify-start bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-green-200 text-green-700 dark:from-green-950/30 dark:to-green-900/30 dark:border-green-800 dark:text-green-400"
              >
                <Repeat size={16} className="mr-2" />
                Nova Transferência
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}