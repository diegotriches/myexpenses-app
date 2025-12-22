import { Card } from '@/components/dashboard/Card';
import { DashboardResumo } from '@/types/dashboard';

type Props = { resumo: DashboardResumo };

export function CardResumo({ resumo }: Props) {
  return (
    <Card titulo="Resumo Financeiro">
      <p>Receitas: R$ {resumo.receitas.toFixed(2)}</p>
      <p>Despesas: R$ {resumo.despesas.toFixed(2)}</p>
      <p>Balanço: R$ {resumo.balanco.toFixed(2)}</p>
    </Card>
  );
}