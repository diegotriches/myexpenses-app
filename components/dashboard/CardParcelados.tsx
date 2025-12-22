import { Card } from './Card';
import { Transacao } from '@/types/transacao';
import { filtrarPorTipo } from '@/utils/dashboard';

type Props = { transacoes: Transacao[] };

export function CardParcelados({ transacoes }: Props) {
  const parcelados = filtrarPorTipo(transacoes, 'parcelado');

  return (
    <Card titulo="Transações Parceladas">
      <ul className="space-y-1">
        {parcelados.map(t => (
          <li key={t.id} className="flex justify-between">
            <span>{t.descricao}</span>
            <span className="text-red-600">R$ {Number(t.valor).toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
