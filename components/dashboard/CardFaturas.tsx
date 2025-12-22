import { Card } from '@/components/dashboard/Card';
import { Transacao } from '@/types/transacao';

type Props = { transacoes: Transacao[], periodo: string }; // YYYY-MM

export function CardFaturas({ transacoes, periodo }: Props) {
  const faturas = transacoes.filter(t => t.data.startsWith(periodo) && t.parcelado);
  const totalFaturas = faturas.length;
  const totalPago = faturas.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor, 0);
  const totalAberto = faturas.reduce((acc, t) => acc + t.valor, 0) - totalPago;

  return (
    <Card titulo="Faturas no Período">
      <p>Total Faturas: {totalFaturas}</p>
      <p>Total Pago: R$ {Number(totalPago).toFixed(2)}</p>
      <p>Total Aberto: R$ {totalAberto.toFixed(2)}</p>
    </Card>
  );
}
