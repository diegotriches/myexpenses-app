import { Card } from '@/components/dashboard/Card';
import { Transacao } from '@/types/transacao';
import { maioresGastos } from '@/utils/dashboard';

type Props = { transacoes: Transacao[], mesAno: string };

export function CardMaioresGastos({ transacoes, mesAno }: Props) {
  const topGastos = maioresGastos(transacoes, mesAno, 5);

  return (
    <Card titulo="Maiores Gastos do Mês">
      <ul className="space-y-1">
        {topGastos.map(t => (
          <li key={t.id} className="flex justify-between">
            <span>{t.descricao}</span>
            <span className="text-red-600">R$ {t.valor.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
