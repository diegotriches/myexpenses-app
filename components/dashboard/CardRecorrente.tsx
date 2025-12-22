import { Card } from '@/components/dashboard/Card';
import { Transacao } from '@/types/transacao';
import { filtrarPorTipo } from '@/utils/dashboard';

type Props = { transacoes: Transacao[] };

export function CardRecorrentes({ transacoes }: Props) {
  const recorrentes = filtrarPorTipo(transacoes, 'recorrente');

  return (
    <Card titulo="Transações Recorrentes">
      <ul className="space-y-1">
        {recorrentes.map(t => (
          <li key={t.id} className="flex justify-between">
            <span>{t.descricao}</span>
            <span className="text-green-600">R$ {(Number(t.valor)).toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
