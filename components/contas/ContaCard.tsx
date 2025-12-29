"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Conta } from "@/types/conta";

import { Pencil, Trash2, FileText, Repeat, TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  conta: Conta;
  onEditar?: (conta: Conta) => void;
  onExcluir?: (conta: Conta) => void;
  onExtrato?: (conta: Conta) => void;
  onTransferir: (contaOrigemId: string) => void;
}

export default function ContaCard({
  conta,
  onEditar,
  onExcluir,
  onExtrato,
  onTransferir,
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
      {/* Cabeçalho */}
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          {bancoImagem && (
            <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center p-1.5">
              <img
                src={bancoImagem}
                alt={conta.banco ?? "Banco"}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div className="flex flex-col">
            <span className="font-semibold text-base leading-tight text-gray-900 dark:text-white">
              {conta.nome}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {conta.banco || "Conta"}
            </span>
          </div>
        </div>

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
        <div className="flex items-center justify-between text-sm pb-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400">Instituição</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {conta.banco || "Não informado"}
          </span>
        </div>

        {/* Divisor */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          {/* Ações principais */}
          <div className="flex gap-2 mb-2">
            {onEditar && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditar(conta)}
                title="Editar informações da conta"
                className="flex-1 gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-950 dark:hover:text-blue-400 dark:hover:border-blue-800 transition-colors cursor-pointer"
              >
                <Pencil size={16} />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            )}

            {onExtrato && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onExtrato(conta)}
                title="Ver extrato e movimentações"
                className="flex-1 gap-2 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 dark:hover:bg-purple-950 dark:hover:text-purple-400 dark:hover:border-purple-800 transition-colors cursor-pointer"
              >
                <FileText size={16} />
                <span className="hidden sm:inline">Extrato</span>
              </Button>
            )}

            {onTransferir && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTransferir(conta.id)}
                title="Transferir entre contas"
                className="flex-1 gap-2 hover:bg-green-50 hover:text-green-600 hover:border-green-200 dark:hover:bg-green-950 dark:hover:text-green-400 dark:hover:border-green-800 transition-colors cursor-pointer"
              >
                <Repeat size={16} />
                <span className="hidden sm:inline">Transferir</span>
              </Button>
            )}
          </div>

          {/* Ação destrutiva separada */}
          {onExcluir && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExcluir(conta)}
              title="Remover esta conta permanentemente"
              className="w-full gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border-red-200 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300 dark:hover:border-red-800 dark:border-red-800 transition-colors cursor-pointer"
            >
              <Trash2 size={16} />
              <span>Excluir Conta</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}