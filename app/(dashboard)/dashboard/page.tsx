"use client"

import { useState } from 'react';
import useSWR from 'swr';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

import { Transacao } from '@/types/transacao';
import { calcularResumo, ultimasTransacoes, contarCondicoes, contarFormas } from '@/utils/dashboard';
import { DashboardGraficoMeses } from '@/types/dashboard';

import { CardResumo } from '@/components/dashboard/CardResumo';
import { CardTransacoesRecentes } from '@/components/dashboard/CardTransacoesRecentes';
import { CardCondicoesPagamento } from '@/components/dashboard/CardCondicoesPagamento';
import { CardFormasPagamento } from '@/components/dashboard/CardFormasPagamento';
import { CardGraficoMeses } from '@/components/dashboard/CardGraficosMeses';
import { CardParcelados } from '@/components/dashboard/CardParcelados';
import { CardRecorrentes } from '@/components/dashboard/CardRecorrente';
import { CardMaioresGastos } from '@/components/dashboard/CardMaioresGastos';
import { CardCategoriasLancamentos } from '@/components/dashboard/CardCategoriasLancamentos';
import { CardCategoriasReceita } from '@/components/dashboard/CardCategoriasReceita';
import { CardCategoriasDespesa } from '@/components/dashboard/CardCategoriasDespesa';
import { CardValores } from '@/components/dashboard/CardValores';
import { CardFaturas } from '@/components/dashboard/CardFaturas';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Dashboard() {
  const [periodo, setPeriodo] = useState<string>('2025-12');

  const { data: transacoes, isLoading: loadingTransacoes } = useSWR<Transacao[]>('/api/transacoes', fetcher);
  const { data: graficoMeses, isLoading: loadingGrafico } = useSWR<DashboardGraficoMeses>(
    `/api/dashboard/grafico?periodo=${periodo}`,
    fetcher
  );

  const resumo = transacoes ? calcularResumo(transacoes) : null;
  const ultimas = transacoes ? ultimasTransacoes(transacoes, 5) : [];
  const condicoes = transacoes ? contarCondicoes(transacoes) : { dinheiro: 0, pix: 0, cartao: 0 };
  const formas = transacoes ? contarFormas(transacoes) : { aVista: 0, parcelado: 0, recorrente: 0 };

  const handlePeriodoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPeriodo(e.target.value);
  };

  const skeleton = <Skeleton count={1} height={80} />;

  return (
    <div>
      <div className="mb-4">
        {loadingTransacoes ? skeleton : <CardResumo resumo={resumo!} />}
      </div>

      {/* Grid com os outros cards - 3 por linha */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loadingTransacoes ? skeleton : <CardValores transacoes={transacoes!} />}
        {loadingTransacoes ? skeleton : <CardFaturas transacoes={transacoes!} periodo={periodo} />}
        {loadingTransacoes ? skeleton : <CardTransacoesRecentes transacoes={ultimas} />}
        {loadingTransacoes ? skeleton : <CardCondicoesPagamento dados={condicoes} />}
        {loadingTransacoes ? skeleton : <CardFormasPagamento dados={formas} />}
        {loadingGrafico ? skeleton : <CardGraficoMeses dados={graficoMeses!} />}
        {loadingTransacoes ? skeleton : <CardParcelados transacoes={transacoes!} />}
        {loadingTransacoes ? skeleton : <CardRecorrentes transacoes={transacoes!} />}
        {loadingTransacoes ? skeleton : <CardMaioresGastos transacoes={transacoes!} mesAno={periodo} />}
        {loadingTransacoes ? skeleton : <CardCategoriasLancamentos transacoes={transacoes!} />}
        {loadingTransacoes ? skeleton : <CardCategoriasReceita transacoes={transacoes!} />}
        {loadingTransacoes ? skeleton : <CardCategoriasDespesa transacoes={transacoes!} />}
      </div>
    </div>
  );
}