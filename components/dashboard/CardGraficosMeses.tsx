import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DashboardGraficoMeses } from '@/types/dashboard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Formata o mês (YYYY-MM) para exibição
  const formatarMes = (mes: string) => {
    const [ano, mesNum] = mes.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mesNum) - 1]}/${ano.slice(2)}`;
  };

  // Prepara dados para o gráfico
  const dadosGrafico = dadosValidos.map(item => ({
    mes: formatarMes(item.mes),
    Receitas: item.receitas,
    Despesas: item.despesas,
    Balanço: item.balanco
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Financeira - Últimos 6 Meses</CardTitle>
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
                  {formatarMoeda(totais.receitas)}
                </span>
              </div>
              
              <div className="flex flex-col items-center p-2 bg-red-50 rounded-lg border border-red-200">
                <TrendingDown className="w-4 h-4 text-red-600 mb-1" />
                <span className="text-xs text-gray-600 font-medium">Despesas</span>
                <span className="text-sm font-bold text-red-700">
                  {formatarMoeda(totais.despesas)}
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
                  {formatarMoeda(totais.balanco)}
                </span>
              </div>
            </div>

            {/* Gráfico */}
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  stroke="#d1d5db"
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  stroke="#d1d5db"
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  width={60}
                />
                <Tooltip 
                  formatter={(value: number) => formatarMoeda(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar 
                  dataKey="Receitas" 
                  fill="#16a34a" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar 
                  dataKey="Despesas" 
                  fill="#dc2626"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar 
                  dataKey="Balanço" 
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}