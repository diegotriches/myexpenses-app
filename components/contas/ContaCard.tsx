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
  PowerOff
} from "lucide-react";

interface Props {
  conta: Conta;
  onEditar?: (conta: Conta) => void;
  onExcluir?: (conta: Conta) => void;
  onExtrato?: (conta: Conta) => void;
  onTransferir: (contaOrigemId: string) => void;
  onToggleAtivo?: (conta: Conta) => void; // Nova prop opcional
}

export default function ContaCard({
  conta,
  onEditar,
  onExcluir,
  onExtrato,
  onTransferir,
  onToggleAtivo,
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
          <DropdownMenuContent align="end" className="w-48">
            {onEditar && (
              <DropdownMenuItem 
                onClick={() => onEditar(conta)}
                className="cursor-pointer"
              >
                <Pencil size={14} className="mr-2" />
                Editar conta
              </DropdownMenuItem>
            )}

            {onToggleAtivo && (
              <DropdownMenuItem 
                onClick={() => onToggleAtivo(conta)}
                className="cursor-pointer"
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
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onExcluir(conta)}
                  className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
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

        {/* Ações principais em destaque */}
        <div className="space-y-2">
          {onExtrato && (
            <Button
              onClick={() => onExtrato(conta)}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
              size="lg"
            >
              <FileText size={16} className="mr-2" />
              Ver Extrato
            </Button>
          )}

          {onTransferir && (
            <Button
              onClick={() => onTransferir(conta.id)}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
              size="lg"
            >
              <Repeat size={16} className="mr-2" />
              Nova Transferência
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}