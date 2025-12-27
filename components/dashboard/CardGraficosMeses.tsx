import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DashboardGraficoMeses } from '@/types/dashboard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

type Props = { dados: DashboardGraficoMeses };

export function CardGraficoMeses({ dados }: Props) {
  const dadosValidos = dados || [];
  
  // Calcula totais do período
  const totais = dadosValidos.reduce(
    (acc, item) => ({
      receitas: acc.receitas + item.receitas,
      despesas: acc.despesas + item.despesas,
      balanco: acc.balanco + item.balanco
    }),
    { receitas: 0, despesas: 0, balanco: 0 }
  );

  // Formata valores para tooltip
  const formatarMoeda = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita/Despesa/Balanço - Últimos 6 Meses</CardTitle>
      </CardHeader>
      <CardContent>
        {dadosValidos.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhum dado disponível</p>
        ) : (
          <div className="space-y-4">
            {/* Cards de resumo */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-2 bg-green-50 rounded-lg border border-green-200">
                <TrendingUp className="w-4 h-4 text-green-600 mb-1" />
                <span className="text-xs text-gray-600 font-medium">Receitas</span>
                <span className="text-sm font-bold text-green-700">
                  R$ {totais.receitas.toFixed(2)}
                </span>
              </div>
              
              <div className="flex flex-col items-center p-2 bg-red-50 rounded-lg border border-red-200">
                <TrendingDown className="w-4 h-4 text-red-600 mb-1" />
                <span className="text-xs text-gray-600 font-medium">Despesas</span>
                <span className="text-sm font-bold text-red-700">
                  R$ {totais.despesas.toFixed(2)}
                </span>
              </div>
              
              <div className={`flex flex-col items-center p-2 rounded-lg border ${
                totais.balanco >= 0 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <DollarSign className={`w-4 h-4 mb-1 ${
                  totais.balanco >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`} />
                <span className="text-xs text-gray-600 font-medium">Balanço</span>
                <span className={`text-sm font-bold ${
                  totais.balanco >= 0 ? 'text-blue-700' : 'text-orange-700'
                }`}>
                  R$ {totais.balanco.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Gráfico */}
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dadosValidos}>
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  tickFormatter={formatarMoeda}
                />
                <Tooltip 
                  formatter={formatarMoeda}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="circle"
                />
                <Bar 
                  dataKey="receitas" 
                  fill="#16a34a" 
                  name="Receitas"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="despesas" 
                  fill="#dc2626" 
                  name="Despesas"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="balanco" 
                  fill="#2563eb" 
                  name="Balanço"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}