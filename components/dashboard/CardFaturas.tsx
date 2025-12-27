import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DashboardCartao } from "@/types/dashboard";
import { CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  cartoes: DashboardCartao[];
}

export function CardFaturas({ cartoes }: Props) {
  // Validação: garante que cartoes seja sempre um array
  const cartoesValidos = cartoes || [];
  
  const totalFaturas = cartoesValidos.reduce((acc, c) => acc + c.totalFatura, 0);
  const totalPagas = cartoesValidos.filter(c => c.paga).reduce((acc, c) => acc + c.totalFatura, 0);
  const totalAbertas = cartoesValidos.filter(c => !c.paga).reduce((acc, c) => acc + c.totalFatura, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-purple-600" />
          Faturas de Cartões
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cartoesValidos.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhuma fatura encontrada</p>
        ) : (
          <div className="space-y-3">
            {/* Lista de cartões */}
            <div className="space-y-2">
              {cartoesValidos.map((cartao) => (
                <div 
                  key={cartao.cartaoId}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className={`p-1.5 rounded-full ${
                      cartao.paga ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {cartao.paga ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {cartao.nome}
                      </p>
                      <p className="text-xs text-gray-500">
                        Fatura do mês
                      </p>
                    </div>
                  </div>

                  <div className="text-right ml-2">
                    <p className="text-sm font-bold text-gray-800 whitespace-nowrap">
                      R$ {cartao.totalFatura.toFixed(2)}
                    </p>
                    {cartao.paga ? (
                      <span className="text-xs font-medium text-green-600">Paga</span>
                    ) : (
                      <span className="text-xs font-medium text-red-600">Em aberto</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo */}
            <div className="pt-2 border-t border-gray-200 space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total em faturas:</span>
                <span className="font-bold text-gray-800">R$ {totalFaturas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Pagas:</span>
                <span className="font-semibold text-green-600">R$ {totalPagas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Em aberto:</span>
                <span className="font-semibold text-red-600">R$ {totalAbertas.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}