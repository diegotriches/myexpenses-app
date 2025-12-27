import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DashboardResumo } from '@/types/dashboard';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

type Props = { resumo: DashboardResumo };

export function CardResumo({ resumo }: Props) {
  const isPositivo = resumo.balanco >= 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo Financeiro</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
        {/* Receitas */}
        <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="p-2 bg-green-100 rounded-full mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-xs text-gray-600 font-medium mb-1">Receitas</p>
          <p className="text-xl font-bold text-green-700">
            R$ {resumo.receitas.toFixed(2)}
          </p>
        </div>

        {/* Despesas */}
        <div className="flex flex-col items-center p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="p-2 bg-red-100 rounded-full mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-xs text-gray-600 font-medium mb-1">Despesas</p>
          <p className="text-xl font-bold text-red-700">
            R$ {resumo.despesas.toFixed(2)}
          </p>
        </div>

        {/* Balanço */}
        <div className={`flex flex-col items-center p-3 rounded-lg border ${
          isPositivo 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className={`p-2 rounded-full mb-2 ${
            isPositivo ? 'bg-blue-100' : 'bg-orange-100'
          }`}>
            <DollarSign className={`w-5 h-5 ${
              isPositivo ? 'text-blue-600' : 'text-orange-600'
            }`} />
          </div>
          <p className="text-xs text-gray-600 font-medium mb-1">Balanço</p>
          <p className={`text-xl font-bold ${
            isPositivo ? 'text-blue-700' : 'text-orange-700'
          }`}>
            R$ {resumo.balanco.toFixed(2)}
          </p>
        </div>
      </div>
    </CardContent>
    </Card>
  );
}