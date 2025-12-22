import { Card } from '@/components/dashboard/Card';
import { Transacao } from '@/types/transacao';

type Props = { transacoes: Transacao[] };

export function CardTransacoesRecentes({ transacoes }: Props) {
  return (
    <Card titulo="Últimas Transações">
      <ul className="space-y-1">
        {transacoes.map(t => (
          <li key={t.id} className="flex justify-between">
            <span>{t.descricao}</span>
            <span className={t.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}>
              R$ {(Number(t.valor)).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
