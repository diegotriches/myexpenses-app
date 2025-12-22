import { Card } from './Card';
import { Transacao } from '@/types/transacao';

type Props = { transacoes: Transacao[] };

export function CardValores({ transacoes }: Props) {
  const recebidos = transacoes
    .filter(t => t.tipo === 'entrada')
    .reduce((acc, t) => acc + t.valor, 0);
  const aPagar = transacoes
    .filter(t => t.tipo === 'saida')
    .reduce((acc, t) => acc + t.valor, 0);

  return (
    <Card titulo="Valores Recebidos / A Pagar">
      <p>Recebidos: R$ {(Number(recebidos)).toFixed(2)}</p>
      <p>A Pagar: R$ {(Number(aPagar)).toFixed(2)}</p>
    </Card>
  );
}
