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

// ✅ NOVOS IMPORTS - React Query
import { useFaturaCartao, usePagarFatura } from "@/hooks/useFaturas";
import { useContas } from "@/hooks/useContas";
import FaturaItem from "@/components/fatura/FaturaItem";
import PagarFaturaModal from "@/components/fatura/PagarFaturaModal";
import { usePeriodo } from "@/contexts/PeriodoContext";

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function FaturaPage() {
  const params = useParams();
  const router = useRouter();
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  const [modalAberto, setModalAberto] = useState(false);

  const { id } = params as { id: string };
  const cartaoId = id;

  const anoNum = anoSelecionado;
  const mesNum = mesSelecionado + 1;

  // ✅ HOOK 1: Buscar contas (React Query)
  const { data: contas = [], isLoading: contasLoading } = useContas();

  // ✅ HOOK 2: Buscar fatura (React Query)
  const {
    fatura,
    transacoes,
    porCategoria,
    isLoading: faturaLoading,
  } = useFaturaCartao({
    cartaoId,
    ano: anoNum,
    mes: mesNum,
  });

  // ✅ HOOK 3: Mutation de pagar fatura (React Query)
  const pagarFaturaMutation = usePagarFatura();

  // Fecha modal quando fatura for paga
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

  // Handler do modal
  const handlePagarFatura = async (dados: {
    contaId: string;
    dataPagamento?: string;
  }) => {
    await pagarFaturaMutation.mutateAsync({
      cartaoId: Number(cartaoId),
      ano: anoNum,
      mes: mesNum,
      contaId: dados.contaId,
      dataPagamento: dados.dataPagamento,
    });
  };

  // ✅ VALIDAÇÕES
  if (!cartaoId || isNaN(anoNum) || isNaN(mesNum)) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Parâmetros inválidos. Verifique a URL e tente novamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ✅ LOADING
  const loading = faturaLoading || contasLoading;
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-3 md:space-y-4">
          <div className="h-6 md:h-8 bg-gray-200 dark:bg-gray-800 rounded w-32 md:w-48 animate-pulse" />
          <div className="h-24 md:h-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="h-32 md:h-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-32 md:h-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>

        {/* Lista Skeleton */}
        <div className="space-y-2 md:space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 md:h-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ✅ FATURA NÃO ENCONTRADA
  if (!fatura) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
          size="sm"
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

  // ✅ DADOS DERIVADOS
  const faturaVazia = transacoes.length === 0;
  const totalFatura = Number(fatura?.total ?? 0);

  // Categoria com maior gasto
  const categorias = Object.entries(porCategoria || {});
  const categoriaComMaiorGasto = categorias.length > 0
    ? categorias.reduce((max, cat) => cat[1] > max[1] ? cat : max)
    : null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* ============================================
          HEADER - Mobile Optimized
          ============================================ */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-9 w-9 md:h-10 md:w-10"
        >
          <ArrowLeft size={18} className="md:hidden" />
          <ArrowLeft size={20} className="hidden md:block" />
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">
            Fatura - {meses[mesSelecionado]} {anoNum}
          </h1>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
            Visualize e gerencie sua fatura
          </p>
        </div>
      </div>

      {/* ============================================
          CARD DE RESUMO - Mobile First
          ============================================ */}
      <Card className={fatura.paga 
        ? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900" 
        : "border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900"
      }>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            {/* Badge de Status */}
            <Badge 
              className={`
                ${fatura.paga
                  ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300"
                  : "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-300"
                }
                text-xs md:text-sm
              `}
            >
              {fatura.paga ? (
                <>
                  <CheckCircle size={12} className="mr-1 md:mr-1.5" />
                  Fatura Paga
                </>
              ) : (
                <>
                  <AlertCircle size={12} className="mr-1 md:mr-1.5" />
                  Em Aberto
                </>
              )}
            </Badge>

            {/* Valor Total - Responsivo */}
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Total da Fatura
              </p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white break-all">
                {formatarMoeda(totalFatura)}
              </p>
            </div>

            {/* Info de Transações */}
            {!fatura.paga && transacoes.length > 0 && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {transacoes.length} {transacoes.length === 1 ? "transação" : "transações"} neste período
              </p>
            )}

            {/* Botão de Pagar - Full Width no Mobile */}
            {!fatura.paga && transacoes.length > 0 && (
              <Button
                onClick={() => setModalAberto(true)}
                disabled={pagarFaturaMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-sm md:text-base"
                size="default"
              >
                {pagarFaturaMutation.isPending ? (
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

      {/* ============================================
          INSIGHTS - Mobile Optimized
          ============================================ */}
      {categoriaComMaiorGasto && !faturaVazia && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
          <PieChart className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <AlertDescription className="text-xs md:text-sm text-blue-800 dark:text-blue-200">
            <strong>Maior gasto:</strong> {categoriaComMaiorGasto[0]} com{" "}
            {formatarMoeda(categoriaComMaiorGasto[1])} (
            {((categoriaComMaiorGasto[1] / totalFatura) * 100).toFixed(1)}% do total)
          </AlertDescription>
        </Alert>
      )}

      {/* ============================================
          GRID DE CARDS - Stack no Mobile
          ============================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* Resumo por Categoria */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <PieChart size={16} className="md:w-[18px] md:h-[18px] text-blue-600" />
              Resumo por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {categorias.length === 0 ? (
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                Sem categorias para exibir
              </p>
            ) : (
              <div className="space-y-3 overflow-x-hidden">
                {categorias
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([categoria, valor]) => {
                    const percentual = (valor / totalFatura) * 100;
                    return (
                      <div key={categoria} className="space-y-1.5 min-w-0">
                        <div className="flex justify-between text-xs md:text-sm gap-2 min-w-0">
                          <span className="font-medium text-gray-700 dark:text-gray-300 truncate min-w-0">
                            {categoria}
                          </span>
                          <span className="text-gray-900 dark:text-white font-semibold flex-shrink-0 whitespace-nowrap">
                            {formatarMoeda(valor)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={percentual} 
                            className="h-1.5 md:h-2 flex-1"
                          />
                          <span className="text-xs text-gray-500 w-10 md:w-12 text-right flex-shrink-0">
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
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Calendar size={16} className="md:w-[18px] md:h-[18px] text-blue-600" />
              Informações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 md:space-y-3 pt-0">
            <div className="flex items-center justify-between p-2.5 md:p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2">
                <Receipt size={14} className="md:w-4 md:h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Transações
                </span>
              </div>
              <span className="font-semibold text-sm md:text-base text-gray-900 dark:text-white">
                {transacoes.length}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 md:p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2">
                <PieChart size={14} className="md:w-4 md:h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Categorias
                </span>
              </div>
              <span className="font-semibold text-sm md:text-base text-gray-900 dark:text-white">
                {categorias.length}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 md:p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="md:w-4 md:h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Período
                </span>
              </div>
              <span className="font-semibold text-sm md:text-base text-gray-900 dark:text-white">
                {meses[mesSelecionado]}/{anoNum}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================
          LISTA DE TRANSAÇÕES - Mobile Optimized
          ============================================ */}
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <Receipt size={16} className="md:w-[18px] md:h-[18px] text-blue-600" />
            Transações ({transacoes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {faturaVazia ? (
            <div className="text-center py-8 md:py-12">
              <Receipt className="mx-auto mb-3 md:mb-4 text-gray-300" size={40} />
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium">
                Nenhuma transação encontrada
              </p>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-500 mt-1">
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

      {/* ============================================
          MODAL DE PAGAMENTO
          ============================================ */}
      <PagarFaturaModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        total={totalFatura}
        contas={contas}
        onConfirmar={handlePagarFatura}
        loading={pagarFaturaMutation.isPending}
      />
    </div>
  );
}