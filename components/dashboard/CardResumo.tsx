"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { DashboardResumo } from '@/types/dashboard';
import { useMoeda } from "@/hooks/useMoeda";

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

  const fmt = useMoeda();

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
      {/* Receitas do Mês */}
      <Card className="border-l-4 border-l-blue-500 dark:border-l-blue-600 dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow overflow-hidden !py-0 !gap-0">
        <CardHeader className="flex flex-row items-center justify-between -space-y-1 !px-3 !pt-3 !pb-1 md:!px-4 md:!pt-5 md:!pb-1.5">
          <CardTitle className="text-[11px] md:text-sm font-medium text-gray-900 dark:text-white leading-none md:leading-normal">
            Receitas
          </CardTitle>
          <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className="!px-3 !pt-0 !pb-3 md:!px-4 md:!pt-0 md:!pb-5">
          <div className="text-base md:text-xl font-bold text-blue-600 dark:text-blue-400 leading-none md:leading-normal !mb-1 md:!mb-1">
            {fmt(resumo.receitas)}
          </div>
          <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 leading-none md:leading-normal mt-0.5 md:mt-1.5">
            {resumo.quantidadeReceitas || 0} lançamento{(resumo.quantidadeReceitas || 0) !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Despesas do Mês */}
      <Card className="border-l-4 border-l-red-500 dark:border-l-red-600 dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow overflow-hidden !py-0 !gap-0">
        <CardHeader className="flex flex-row items-center justify-between -space-y-1 !px-3 !pt-3 !pb-1 md:!px-4 md:!pt-5 md:!pb-1.5">
          <CardTitle className="text-[11px] md:text-sm font-medium text-gray-900 dark:text-white leading-none md:leading-normal">
            Despesas
          </CardTitle>
          <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className="!px-3 !pt-0 !pb-3 md:!px-4 md:!pt-0 md:!pb-5">
          <div className="text-base md:text-xl font-bold text-red-600 dark:text-red-400 leading-none md:leading-normal !mb-1 md:!mb-1">
            {fmt(resumo.despesas)}
          </div>
          <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 leading-none md:leading-normal mt-0.5 md:mt-1.5">
            {resumo.quantidadeDespesas || 0} lançamento{(resumo.quantidadeDespesas || 0) !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Saldo do Mês */}
      <Card className={`border-l-4 ${
        resumo.saldo >= 0
          ? 'border-l-green-500 dark:border-l-green-600'
          : 'border-l-red-500 dark:border-l-red-600'
      } dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow overflow-hidden !py-0 !gap-0`}>
        <CardHeader className="flex flex-row items-center justify-between -space-y-1 !px-3 !pt-3 !pb-1 md:!px-4 md:!pt-5 md:!pb-1.5">
          <CardTitle className="text-[11px] md:text-sm font-medium text-gray-900 dark:text-white leading-none md:leading-normal">
            Saldo do Mês
          </CardTitle>
          <DollarSign className={`h-3 w-3 md:h-4 md:w-4 flex-shrink-0 ${
            resumo.saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`} />
        </CardHeader>
        <CardContent className="!px-3 !pt-0 !pb-3 md:!px-4 md:!pt-0 md:!pb-5">
          <div className={`text-base md:text-xl font-bold leading-none md:leading-normal !mb-1 md:!mb-1 ${
            resumo.saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {fmt(resumo.saldo)}
          </div>
          <div className="flex items-center gap-0.5 mt-0.5 md:gap-1 md:mt-1.5">
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
      <Card className="border-l-4 border-l-orange-500 dark:border-l-orange-600 dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow overflow-hidden !py-0 !gap-0">
        <CardHeader className="flex flex-row items-center justify-between -space-y-1 !px-3 !pt-3 !pb-1 md:!px-4 md:!pt-5 md:!pb-1.5">
          <CardTitle className="text-[11px] md:text-sm font-medium text-gray-900 dark:text-white leading-none md:leading-normal">
            Despesas Futuras
          </CardTitle>
          <Calendar className="h-3 w-3 md:h-4 md:w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className="!px-3 !pt-0 !pb-3 md:!px-4 md:!pt-0 md:!pb-5">
          <div className="text-base md:text-xl font-bold text-orange-600 dark:text-orange-400 leading-none md:leading-normal !mb-1 md:!mb-1">
            {fmt(despesasFuturas?.total || 0)}
          </div>
          <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 leading-none md:leading-normal mt-0.5 md:mt-1.5">
            {despesasFuturas?.quantidade || 0} despesa{(despesasFuturas?.quantidade || 0) !== 1 ? 's' : ''} pendente{(despesasFuturas?.quantidade || 0) !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}