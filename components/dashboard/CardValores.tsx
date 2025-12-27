import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type Props = { transacoes: Transacao[] };

export function CardValores({ transacoes }: Props) {
  const recebidos = transacoes
    .filter(t => t.tipo === 'entrada')
    .reduce((acc, t) => acc + Number(t.valor), 0);
  const aPagar = transacoes
    .filter(t => t.tipo === 'saida')
    .reduce((acc, t) => acc + Number(t.valor), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Valores do Período</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Recebidos */}
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-100 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-0.5">Recebidos</p>
                <p className="text-lg font-bold text-emerald-700">
                  R$ {recebidos.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* A Pagar */}
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-100 rounded-full">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-0.5">A Pagar</p>
                <p className="text-lg font-bold text-amber-700">
                  R$ {aPagar.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Diferença */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600">Diferença:</span>
              <span className={`text-base font-bold ${
                (recebidos - aPagar) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                R$ {(recebidos - aPagar).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}