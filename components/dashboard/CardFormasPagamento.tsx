import { Card } from '@/components/dashboard/Card';
import { FormaPagamento } from '@/types/dashboard';

type Props = { dados: Record<FormaPagamento, number> };

export function CardFormasPagamento({ dados }: Props) {
  return (
    <Card titulo="Formas de Pagamento">
      <ul>
        {Object.entries(dados).map(([forma, valor]) => (
          <li key={forma}>{forma}: {valor}</li>
        ))}
      </ul>
    </Card>
  );
}
