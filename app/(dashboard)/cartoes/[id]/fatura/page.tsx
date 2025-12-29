"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  PieChart,
  Receipt,
  Loader2,
} from "lucide-react";

import { useFaturaCartao } from "@/hooks/useFaturaCartao";
import FaturaItem from "@/components/fatura/FaturaItem";
import PagarFaturaModal from "@/components/fatura/PagarFaturaModal";
import { usePeriodo } from "@/contexts/PeriodoContext";
import { useContas } from "@/hooks/useContas";

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function FaturaPage() {
  const params = useParams();
  const router = useRouter();
  const { contas } = useContas();
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  const [modalAberto, setModalAberto] = useState(false);

  const { id } = params as { id: string };
  const cartaoId = id;

  const anoNum = anoSelecionado;
  const mesNum = mesSelecionado + 1;

  const {
    fatura,
    transacoes,
    porCategoria,
    loading,
    pagarFatura,
    pagando,
  } = useFaturaCartao({
    cartaoId,
    ano: anoNum,
    mes: mesNum,
  });

  useEffect(() => {
    if (fatura?.paga) {
      setModalAberto(false);
    }
  }, [fatura?.paga]);

  // Formatação monetária
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Validações
  if (!cartaoId || isNaN(anoNum) || isNaN(mesNum)) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Parâmetros inválidos. Verifique a URL e tente novamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-40 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Lista Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Fatura não encontrada
  if (!fatura) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Voltar
        </Button>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Fatura não encontrada para o período {meses[mesSelecionado]}/{anoNum}.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const faturaVazia = transacoes.length === 0;
  const totalFatura = Number(fatura?.total ?? 0);

  // Categoria com maior gasto
  const categorias = Object.entries(porCategoria);
  const categoriaComMaiorGasto = categorias.length > 0
    ? categorias.reduce((max, cat) => cat[1] > max[1] ? cat : max)
    : null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft size={20} />
        </Button>

        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Fatura - {meses[mesSelecionado]} {anoNum}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Visualize e gerencie sua fatura do período
          </p>
        </div>
      </div>

      {/* Card de Resumo */}
      <Card className={fatura.paga 
        ? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900" 
        : "border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900"
      }>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Badge 
                  className={fatura.paga
                    ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300"
                    : "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-300"
                  }
                >
                  {fatura.paga ? (
                    <>
                      <CheckCircle size={14} className="mr-1" />
                      Fatura Paga
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} className="mr-1" />
                      Em Aberto
                    </>
                  )}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total da Fatura</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatarMoeda(totalFatura)}
                </p>
              </div>

              {!fatura.paga && transacoes.length > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {transacoes.length} {transacoes.length === 1 ? "transação" : "transações"} neste período
                </p>
              )}
            </div>

            {!fatura.paga && transacoes.length > 0 && (
              <Button
                onClick={() => setModalAberto(true)}
                disabled={pagando}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
              >
                {pagando ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Pagando...
                  </>
                ) : (
                  <>
                    <DollarSign size={16} className="mr-2" />
                    Pagar Fatura
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {categoriaComMaiorGasto && !faturaVazia && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
          <PieChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Maior gasto:</strong> {categoriaComMaiorGasto[0]} com{" "}
            {formatarMoeda(categoriaComMaiorGasto[1])} (
            {((categoriaComMaiorGasto[1] / totalFatura) * 100).toFixed(1)}% do total)
          </AlertDescription>
        </Alert>
      )}

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Resumo por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart size={18} className="text-blue-600" />
              Resumo por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categorias.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sem categorias para exibir
              </p>
            ) : (
              <div className="space-y-3">
                {categorias
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([categoria, valor]) => {
                    const percentual = (valor / totalFatura) * 100;
                    return (
                      <div key={categoria} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {categoria}
                          </span>
                          <span className="text-gray-900 dark:text-white font-semibold">
                            {formatarMoeda(valor)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={percentual} 
                            className="h-2 flex-1"
                          />
                          <span className="text-xs text-gray-500 w-12 text-right">
                            {percentual.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações da Fatura */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Informações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Transações
                </span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {transacoes.length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2">
                <PieChart size={16} className="text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Categorias
                </span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {categorias.length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Período
                </span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {meses[mesSelecionado]}/{anoNum}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Transações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt size={18} className="text-blue-600" />
            Transações ({transacoes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {faturaVazia ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto mb-4 text-gray-300" size={48} />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Nenhuma transação encontrada
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Não há transações registradas para este período
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transacoes.map((t) => (
                <FaturaItem key={t.id} transacao={t} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Pagamento */}
      <PagarFaturaModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        total={totalFatura}
        contas={contas}
        onConfirmar={pagarFatura}
      />
    </div>
  );
}