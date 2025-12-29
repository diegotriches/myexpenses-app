import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from "@/types/transacao";
import { CreditCard, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
  transacoes: Transacao[];
  periodo: string; // formato: YYYY-MM
}

interface CartaoFatura {
  cartaoId: number;
  nome: string;
  total: number;
}

export function CardFaturas({ transacoes, periodo }: Props) {
  // Calcula faturas por cartão
  const faturas = useMemo(() => {
    const despesasCartao = transacoes.filter(
      t => t.tipo === 'saida' && 
           t.formaPagamento === 'cartao' && 
           t.cartaoId &&
           t.data.startsWith(periodo)
    );

    // Agrupa por cartão
    const porCartao = new Map<number, number>();
    
    despesasCartao.forEach(t => {
      if (t.cartaoId) {
        const atual = porCartao.get(t.cartaoId) || 0;
        porCartao.set(t.cartaoId, atual + Number(t.valor));
      }
    });

    // Converte para array
    const resultado: CartaoFatura[] = Array.from(porCartao.entries()).map(([id, total]) => ({
      cartaoId: id,
      nome: `Cartão ${id}`, // Idealmente buscar nome real do cartão
      total,
    }));

    return resultado;
  }, [transacoes, periodo]);

  const totalGeral = faturas.reduce((acc, f) => acc + f.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Faturas de Cartões
        </CardTitle>
      </CardHeader>
      <CardContent>
        {faturas.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Nenhuma despesa com cartão neste período
          </p>
        ) : (
          <div className="space-y-3">
            {/* Lista de cartões */}
            <div className="space-y-2">
              {faturas.map((fatura) => (
                <div 
                  key={fatura.cartaoId}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="p-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30">
                      <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {fatura.nome}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Fatura do mês
                      </p>
                    </div>
                  </div>

                  <div className="text-right ml-2">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      R$ {fatura.total.toFixed(2)}
                    </p>
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">Em aberto</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total em faturas:</span>
                <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                  R$ {totalGeral.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Despesas com cartão não impactam o saldo das contas até o pagamento da fatura.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}