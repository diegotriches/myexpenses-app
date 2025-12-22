import { useEffect, useState } from 'react';
import { Transacao } from '@/types/transacao';
import { DashboardResumo, DashboardGraficoMeses, CondicaoPagamento, FormaPagamento } from '@/types/dashboard';
import { calcularResumo, ultimasTransacoes, contarCondicoes, contarFormas } from '@/utils/dashboard';
import { CardResumo } from '@/components/dashboard/CardResumo';
import { CardTransacoesRecentes } from '@/components/dashboard/CardTransacoesRecentes';
import { CardCondicoesPagamento } from '@/components/dashboard/CardCondicoesPagamento';
import { CardFormasPagamento } from '@/components/dashboard/CardFormasPagamento';
import { CardGraficoMeses } from '@/components/dashboard/CardGraficosMeses';

export default function Dashboard() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [graficoMeses, setGraficoMeses] = useState<DashboardGraficoMeses>([]);

  const resumo: DashboardResumo = calcularResumo(transacoes);
  const ultimas = ultimasTransacoes(transacoes, 5);
  const condicoes: Record<CondicaoPagamento, number> = contarCondicoes(transacoes);
  const formas: Record<FormaPagamento, number> = contarFormas(transacoes);

  useEffect(() => {
    // Aqui você chamaria o backend para buscar as transações
    // setTransacoes(dados);
    // setGraficoMeses(dadosGrafico);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <CardResumo resumo={resumo} />
      <CardTransacoesRecentes transacoes={ultimas} />
      <CardCondicoesPagamento dados={condicoes} />
      <CardFormasPagamento dados={formas} />
      <CardGraficoMeses dados={graficoMeses} />
      {/* Adicione os demais cards usando funções utilitárias para filtrar e agrupar dados */}
    </div>
  );
}
