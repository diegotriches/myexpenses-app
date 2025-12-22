import { Card } from '@/components/dashboard/Card';
import { Transacao } from '@/types/transacao';
import { categoriasMais } from '@/utils/dashboard';

type Props = { transacoes: Transacao[] };

export function CardCategoriasReceita({ transacoes }: Props) {
  const categorias = categoriasMais(transacoes, 'receita');

  return (
    <Card titulo="Categorias com Maior Receita">
      <ul>
        {categorias.map(c => (
          <li key={c.categoria}>{c.categoria}: {(Number(c.total)).toFixed(2)}</li>
        ))}
      </ul>
    </Card>
  );
}
