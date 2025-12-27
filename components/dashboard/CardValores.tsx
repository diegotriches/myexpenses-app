import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { CheckCircle2, Clock } from 'lucide-react';
import { useMemo } from 'react';

type Props = { transacoes: Transacao[] };

export function CardValores({ transacoes }: Props) {
  const { recebidos, aPagar, aReceber } = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Receitas já recebidas (data <= hoje)
    const recebidos = transacoes
      .filter(t => t.tipo === 'entrada' && new Date(t.data) <= hoje)
      .reduce((acc, t) => acc + Number(t.valor), 0);

    // Receitas futuras (data > hoje)
    const aReceber = transacoes
      .filter(t => t.tipo === 'entrada' && new Date(t.data) > hoje)
      .reduce((acc, t) => acc + Number(t.valor), 0);

    // Despesas futuras (data > hoje)
    const aPagar = transacoes
      .filter(t => t.tipo === 'saida' && new Date(t.data) > hoje)
      .reduce((acc, t) => acc + Number(t.valor), 0);

    return { recebidos, aPagar, aReceber };
  }, [transacoes]);

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
                <p className="text-xs text-gray-600 font-medium mb-0.5">Já Recebido</p>
                <p className="text-lg font-bold text-emerald-700">
                  R$ {recebidos.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* A Receber */}
          {aReceber > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-100 rounded-full">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-0.5">A Receber</p>
                  <p className="text-lg font-bold text-blue-700">
                    R$ {aReceber.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* A Pagar */}
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-100 rounded-full">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-0.5">A Pagar</p>
                <p className="text-lg font-bold text-amber-700">
                  R$ {aPagar.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Projeção */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600">Projeção (a receber - a pagar):</span>
              <span className={`text-base font-bold ${
                (aReceber - aPagar) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                R$ {(aReceber - aPagar).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}