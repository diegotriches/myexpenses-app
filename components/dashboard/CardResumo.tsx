// src/components/dashboard/CardResumo.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { DashboardResumo } from '@/types/dashboard';

interface Props {
  resumo: DashboardResumo;
  saldoContas?: number;
  quantidadeContas?: number;
  despesasFuturas?: {
    total: number;
    quantidade: number;
  };
}

export function CardResumo({ resumo, despesasFuturas }: Props) {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
      {/* Receitas do Mês */}
      <Card className="border-l-4 border-l-blue-500 dark:border-l-blue-600 dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between -space-y-1 !px-2 !pt-1 !pb-0.5 md:!px-6 md:!py-0 md:pb-1">
          <CardTitle className="text-[11px] md:text-sm font-medium text-gray-900 dark:text-white leading-none md:leading-normal">
            Receitas
          </CardTitle>
          <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className="!px-2 !pt-0 !pb-1 md:!px-6 md:!pt-0 md:!pb-6">
          <div className="text-base md:text-2xl font-bold text-blue-600 dark:text-blue-400 leading-none md:leading-normal !mb-0.5 md:!mb-0">
            {formatarMoeda(resumo.receitas)}
          </div>
          <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 leading-none md:leading-normal md:mt-1">
            {resumo.quantidadeReceitas || 0} lançamento{(resumo.quantidadeReceitas || 0) !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Despesas do Mês */}
      <Card className="border-l-4 border-l-red-500 dark:border-l-red-600 dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between -space-y-1 !px-2 !pt-1 !pb-0.5 md:!px-6 md:!py-0 md:pb-1">
          <CardTitle className="text-[11px] md:text-sm font-medium text-gray-900 dark:text-white leading-none md:leading-normal">
            Despesas
          </CardTitle>
          <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className="!px-2 !pt-0 !pb-1 md:!px-6 md:!pt-0 md:!pb-6">
          <div className="text-base md:text-2xl font-bold text-red-600 dark:text-red-400 leading-none md:leading-normal !mb-0.5 md:!mb-0">
            {formatarMoeda(resumo.despesas)}
          </div>
          <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 leading-none md:leading-normal md:mt-1">
            {resumo.quantidadeDespesas || 0} lançamento{(resumo.quantidadeDespesas || 0) !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Saldo do Mês */}
      <Card className={`border-l-4 ${
        resumo.saldo >= 0 
          ? 'border-l-green-500 dark:border-l-green-600' 
          : 'border-l-red-500 dark:border-l-red-600'
      } dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow overflow-hidden`}>
        <CardHeader className="flex flex-row items-center justify-between -space-y-1 !px-2 !pt-1 !pb-0.5 md:!px-6 md:!py-0 md:pb-1">
          <CardTitle className="text-[11px] md:text-sm font-medium text-gray-900 dark:text-white leading-none md:leading-normal">
            Saldo do Mês
          </CardTitle>
          <DollarSign className={`h-3 w-3 md:h-4 md:w-4 flex-shrink-0 ${
            resumo.saldo >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`} />
        </CardHeader>
        <CardContent className="!px-2 !pt-0 !pb-1 md:!px-6 md:!pt-0 md:!pb-6">
          <div className={`text-base md:text-2xl font-bold leading-none md:leading-normal !mb-0.5 md:!mb-0 ${
            resumo.saldo >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {formatarMoeda(resumo.saldo)}
          </div>
          <div className="flex items-center gap-0.5 md:gap-1 md:mt-1">
            {resumo.saldo >= 0 ? (
              <ArrowUpRight className="h-2 w-2 md:h-3 md:w-3 text-green-600 dark:text-green-400" />
            ) : (
              <ArrowDownRight className="h-2 w-2 md:h-3 md:w-3 text-red-600 dark:text-red-400" />
            )}
            <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 leading-none md:leading-normal">
              {resumo.saldo >= 0 ? 'Positivo' : 'Negativo'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Despesas Futuras */}
      <Card className="border-l-4 border-l-orange-500 dark:border-l-orange-600 dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between -space-y-1 !px-2 !pt-1 !pb-0.5 md:!px-6 md:!py-0 md:pb-1">
          <CardTitle className="text-[11px] md:text-sm font-medium text-gray-900 dark:text-white leading-none md:leading-normal">
            Despesas Futuras
          </CardTitle>
          <Calendar className="h-3 w-3 md:h-4 md:w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className="!px-2 !pt-0 !pb-1 md:!px-6 md:!pt-0 md:!pb-6">
          <div className="text-base md:text-2xl font-bold text-orange-600 dark:text-orange-400 leading-none md:leading-normal !mb-0.5 md:!mb-0">
            {formatarMoeda(despesasFuturas?.total || 0)}
          </div>
          <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 leading-none md:leading-normal md:mt-1">
            {despesasFuturas?.quantidade || 0} despesa{(despesasFuturas?.quantidade || 0) !== 1 ? 's' : ''} pendente{(despesasFuturas?.quantidade || 0) !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}