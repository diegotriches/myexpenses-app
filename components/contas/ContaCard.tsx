"use client";

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

export default function ContaCard({
  conta,
  onEditar,
  onExcluir,
  onExtrato,
  onTransferir,
  onToggleAtivo,
  onAjustarSaldo,
}: Props) {
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

        {/* Ações: ícone e texto sempre visíveis, em qualquer tela (antes o nome só aparecia no
            hover do mouse, e no celular ficava atrás de "Mais Opções") */}
        <div className="grid grid-cols-3 gap-2">
          {onAjustarSaldo && (
            <button
              type="button"
              onClick={() => onAjustarSaldo(conta)}
              title="Ajustar saldo"
              className="flex items-center justify-center gap-1.5 h-9 rounded-md border text-xs font-medium transition-colors bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/40"
            >
              <DollarSign size={15} className="flex-shrink-0" />
              <span className="truncate">Ajustar</span>
            </button>
          )}
          {onExtrato && (
            <button
              type="button"
              onClick={() => onExtrato(conta)}
              title="Ver extrato"
              className="flex items-center justify-center gap-1.5 h-9 rounded-md border text-xs font-medium transition-colors bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/40"
            >
              <FileText size={15} className="flex-shrink-0" />
              <span className="truncate">Extrato</span>
            </button>
          )}
          {onTransferir && (
            <button
              type="button"
              onClick={() => onTransferir(conta.id)}
              title="Nova transferência"
              className="flex items-center justify-center gap-1.5 h-9 rounded-md border text-xs font-medium transition-colors bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/40"
            >
              <Repeat size={15} className="flex-shrink-0" />
              <span className="truncate">Transferir</span>
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}