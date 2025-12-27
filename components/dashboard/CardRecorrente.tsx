import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { filtrarRecorrentes } from '@/utils/dashboard';
import { Repeat, ArrowUpCircle, ArrowDownCircle, Calendar } from 'lucide-react';
import { useMemo } from 'react';

type Props = { transacoes: Transacao[] };

export function CardRecorrentes({ transacoes }: Props) {
  const recorrentes = useMemo(() => filtrarRecorrentes(transacoes), [transacoes]);
  
  // Agrupa por recorrenciaId para mostrar cada recorrência uma vez
  const recorrenciasAgrupadas = useMemo(() => {
    const mapa = new Map<string, Transacao & { totalRecorrencia: number; quantidadeParcelas: number }>();
    
    recorrentes.forEach(t => {
      if (t.recorrenciaId) {
        if (!mapa.has(t.recorrenciaId)) {
          // Primeira ocorrência encontrada
          const valorMensal = Number(t.valor);
          const totalRecorrencia = t.repeticoes ? valorMensal * t.repeticoes : valorMensal;
          const quantidadeParcelas = t.repeticoes || 1;
          
          mapa.set(t.recorrenciaId, {
            ...t,
            totalRecorrencia,
            quantidadeParcelas
          });
        }
      } else {
        // Transação recorrente sem ID de grupo (caso isolado)
        const valorMensal = Number(t.valor);
        const totalRecorrencia = t.repeticoes ? valorMensal * t.repeticoes : valorMensal;
        const quantidadeParcelas = t.repeticoes || 1;
        
        mapa.set(t.id, {
          ...t,
          totalRecorrencia,
          quantidadeParcelas
        });
      }
    });
    
    return Array.from(mapa.values());
  }, [recorrentes]);
  
  // Separa receitas e despesas
  const receitas = useMemo(
    () => recorrenciasAgrupadas.filter(t => t.tipo === 'entrada'),
    [recorrenciasAgrupadas]
  );
  
  const despesas = useMemo(
    () => recorrenciasAgrupadas.filter(t => t.tipo === 'saida'),
    [recorrenciasAgrupadas]
  );
  
  const totalReceitas = useMemo(
    () => receitas.reduce((acc, t) => acc + Number(t.valor), 0),
    [receitas]
  );
  
  const totalDespesas = useMemo(
    () => despesas.reduce((acc, t) => acc + Number(t.valor), 0),
    [despesas]
  );
  
  const totalRecorrente = totalReceitas + totalDespesas;

  const formatarData = (data: string | Date) => {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-purple-600" />
          Transações Recorrentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recorrenciasAgrupadas.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhuma transação recorrente encontrada
          </p>
        ) : (
          <div className="space-y-2.5">
            {recorrenciasAgrupadas.slice(0, 5).map((t) => {
              const porcentagem = totalRecorrente > 0 
                ? (Number(t.valor) / totalRecorrente) * 100 
                : 0;
              const isReceita = t.tipo === 'entrada';
              
              return (
                <div 
                  key={t.recorrenciaId || t.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-1.5 rounded-full flex-shrink-0 ${
                    isReceita ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {isReceita ? (
                      <ArrowUpCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {t.descricao || (isReceita ? 'Receita recorrente' : 'Despesa recorrente')}
                      </span>
                      <span className={`text-sm font-bold ml-2 whitespace-nowrap ${
                        isReceita ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isReceita ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            isReceita ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${porcentagem}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        {porcentagem.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {t.data && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatarData(t.data)}
                        </div>
                      )}
                      {t.quantidadeParcelas > 1 && (
                        <div className="flex items-center gap-1 font-medium text-purple-600">
                          <Repeat className="w-3 h-3" />
                          {t.quantidadeParcelas} meses
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Total e Resumo */}
            <div className="pt-2 border-t border-gray-200 space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Receitas mensais:</span>
                <span className="font-semibold text-green-600">
                  R$ {totalReceitas.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Despesas mensais:</span>
                <span className="font-semibold text-red-600">
                  R$ {totalDespesas.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-600">Impacto mensal:</span>
                <span className={`text-base font-bold ${
                  (totalReceitas - totalDespesas) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(totalReceitas - totalDespesas) >= 0 ? '+' : '-'} R$ {Math.abs(totalReceitas - totalDespesas).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Total de recorrências:</span>
                <span className="font-semibold">{recorrenciasAgrupadas.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Total de lançamentos:</span>
                <span className="font-semibold">{recorrentes.length}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}