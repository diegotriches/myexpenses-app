import { Card } from './Card';
import { CondicaoPagamento } from '@/types/dashboard';

type Props = { dados: Record<CondicaoPagamento, number> };

export function CardCondicoesPagamento({ dados }: Props) {
  return (
    <Card titulo="Condições de Pagamento">
      <ul>
        {Object.entries(dados).map(([condicao, valor]) => (
          <li key={condicao}>{condicao}: {valor}</li>
        ))}
      </ul>
    </Card>
  );
}
