import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardResumo {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  quantidadeReceitas: number;
  quantidadeDespesas: number;
}

interface Props {
  resumo: DashboardResumo;
  saldoContas?: number;
  quantidadeContas?: number;
}

export function CardResumo({ resumo, saldoContas, quantidadeContas }: Props) {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Saldo Total em Contas */}
      {saldoContas !== undefined && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo em Contas</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatarMoeda(saldoContas)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {quantidadeContas || 0} conta(s) ativa(s)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Receitas do Mês */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receitas</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatarMoeda(resumo.totalReceitas)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {resumo.quantidadeReceitas} lançamento(s)
          </p>
        </CardContent>
      </Card>

      {/* Despesas do Mês */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Despesas</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatarMoeda(resumo.totalDespesas)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {resumo.quantidadeDespesas} lançamento(s)
          </p>
        </CardContent>
      </Card>

      {/* Saldo do Mês */}
      <Card className={`border-l-4 ${resumo.saldo >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo do Mês</CardTitle>
          <DollarSign className={`h-4 w-4 ${resumo.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${resumo.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatarMoeda(resumo.saldo)}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {resumo.saldo >= 0 ? (
              <ArrowUpRight className="h-3 w-3 text-green-600" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-600" />
            )}
            <p className="text-xs text-muted-foreground">
              {resumo.saldo >= 0 ? 'Positivo' : 'Negativo'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}