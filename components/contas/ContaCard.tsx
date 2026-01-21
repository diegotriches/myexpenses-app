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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  // Formata valor em Real brasileiro
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Define cor do saldo baseado no valor
  const getCorSaldo = () => {
    if (conta.saldoAtual > 0) return "text-green-600 dark:text-green-400";
    if (conta.saldoAtual < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  // Ícone do saldo
  const IconeSaldo = conta.saldoAtual >= 0 ? TrendingUp : TrendingDown;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Cabeçalho com Menu */}
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="flex items-center gap-3 flex-1">
          {bancoImagem && (
            <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center p-1.5">
              <img
                src={bancoImagem}
                alt={conta.banco ?? "Banco"}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-base leading-tight text-gray-900 dark:text-white">
                {conta.nome}
              </span>
              {/* Badge de Status */}
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
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {conta.banco || "Conta"}
            </span>
          </div>
        </div>

        {/* Menu Dropdown de Ações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 dark:bg-gray-800 dark:border-gray-700">
            {onEditar && (
              <DropdownMenuItem 
                onClick={() => onEditar(conta)}
                className="cursor-pointer dark:hover:bg-gray-700"
              >
                <Pencil size={14} className="mr-2" />
                Editar conta
              </DropdownMenuItem>
            )}

            {onToggleAtivo && (
              <DropdownMenuItem 
                onClick={() => onToggleAtivo(conta)}
                className="cursor-pointer dark:hover:bg-gray-700"
              >
                {conta.ativo ? (
                  <>
                    <PowerOff size={14} className="mr-2" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Power size={14} className="mr-2" />
                    Ativar
                  </>
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

      {/* Conteúdo */}
      <CardContent className="space-y-4">
        {/* Saldo */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
              Saldo Atual
            </span>
            <IconeSaldo 
              size={16} 
              className={`${getCorSaldo()}`}
            />
          </div>
          <div className={`text-2xl font-bold ${getCorSaldo()}`}>
            {formatarMoeda(conta.saldoAtual)}
          </div>
        </div>

        {/* Informações da conta */}
        <div className="flex items-center justify-between text-sm pb-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400">Instituição</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {conta.banco || "Não informado"}
          </span>
        </div>

        {/* ✅ NOVO: Ações principais compactas com ícones + tooltip */}
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center justify-center gap-2">
            {/* Ajustar Saldo */}
            {onAjustarSaldo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => onAjustarSaldo(conta)}
                    variant="outline"
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-blue-200 text-blue-700 hover:text-blue-800 dark:from-blue-950/30 dark:to-blue-900/30 dark:border-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <DollarSign size={20} className="flex-shrink-0" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Ajustar Saldo</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Ver Extrato */}
            {onExtrato && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => onExtrato(conta)}
                    variant="outline"
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-purple-200 text-purple-700 hover:text-purple-800 dark:from-purple-950/30 dark:to-purple-900/30 dark:border-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <FileText size={20} className="flex-shrink-0" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Ver Extrato</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Nova Transferência */}
            {onTransferir && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => onTransferir(conta.id)}
                    variant="outline"
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-green-200 text-green-700 hover:text-green-800 dark:from-green-950/30 dark:to-green-900/30 dark:border-green-800 dark:text-green-400 dark:hover:text-green-300 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Repeat size={20} className="flex-shrink-0" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Nova Transferência</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}