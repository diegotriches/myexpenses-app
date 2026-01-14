// src/components/dashboard/CardResumo.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { DashboardResumo } from '@/types/dashboard';

interface Props {
  resumo: DashboardResumo;
  saldoContas?: number;
  quantidadeContas?: number;
}

export function CardResumo({ resumo, saldoContas, quantidadeContas }: Props) {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Saldo Total em Contas */}
      {saldoContas !== undefined && (
        <Card className="border-l-4 border-l-green-500 dark:border-l-green-600 dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
              Saldo em Contas
            </CardTitle>
            <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatarMoeda(saldoContas)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {quantidadeContas || 0} conta{(quantidadeContas || 0) !== 1 ? 's' : ''} ativa{(quantidadeContas || 0) !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Receitas do Mês */}
      <Card className="border-l-4 border-l-blue-500 dark:border-l-blue-600 dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
            Receitas
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatarMoeda(resumo.receitas)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {resumo.quantidadeReceitas || 0} lançamento{(resumo.quantidadeReceitas || 0) !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Despesas do Mês */}
      <Card className="border-l-4 border-l-red-500 dark:border-l-red-600 dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
            Despesas
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatarMoeda(resumo.despesas)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {resumo.quantidadeDespesas || 0} lançamento{(resumo.quantidadeDespesas || 0) !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Saldo do Mês */}
      <Card className={`border-l-4 ${
        resumo.saldo >= 0 
          ? 'border-l-green-500 dark:border-l-green-600' 
          : 'border-l-red-500 dark:border-l-red-600'
      } dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
            Saldo do Mês
          </CardTitle>
          <DollarSign className={`h-4 w-4 ${
            resumo.saldo >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            resumo.saldo >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {formatarMoeda(resumo.saldo)}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {resumo.saldo >= 0 ? (
              <ArrowUpRight className="h-3 w-3 text-green-600 dark:text-green-400" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-600 dark:text-red-400" />
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {resumo.saldo >= 0 ? 'Positivo' : 'Negativo'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}