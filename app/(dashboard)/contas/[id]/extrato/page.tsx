"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, MoreVertical, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import FiltrosExtrato, { FiltrosExtratoState } from "@/components/extrato/FiltrosExtrato";
import ModalExcluirExtrato from "@/components/extrato/ModalExcluirExtrato";

import { useExtratoConta, useRemoverExtrato } from "@/hooks/useContas";
import type { MovimentacaoExtrato } from "@/types/conta";

export default function ExtratoContaPage() {
  const params = useParams();
  const router = useRouter();
  const contaId = params?.id as string;

  const removerExtrato = useRemoverExtrato();

  // Modal de exclusão
  const [modalExcluir, setModalExcluir] = useState(false);
  const [itemExcluir, setItemExcluir] = useState<MovimentacaoExtrato | null>(null);

  // Filtros
  const [filtros, setFiltros] = useState<FiltrosExtratoState>({
    inicio: "",
    fim: "",
    tipo: "TODOS",
    origem: "TODAS",
  });

  // Preparar filtros para React Query
  const filtrosQuery = useMemo(() => {
    const params: any = {};
    if (filtros.inicio) params.inicio = filtros.inicio;
    if (filtros.fim) params.fim = filtros.fim;
    if (filtros.tipo !== "TODOS") params.tipo = filtros.tipo;
    if (filtros.origem !== "TODAS") params.origem = filtros.origem;
    return params;
  }, [filtros]);

  const { 
    data: extratoData, 
    isLoading: loading,
    error 
  } = useExtratoConta(contaId, filtrosQuery);

  // Extrair dados da resposta
  const extrato = extratoData?.movimentacoes ?? [];
  const resumo = extratoData?.resumo;
  const contaNome = extratoData?.conta?.nome ?? "";

  // ✅ Helper para formatar moeda
  const formatarMoeda = (valor: number): string => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Handler para excluir
  const handleExcluir = async () => {
    if (!itemExcluir) return;

    try {
      await removerExtrato.mutateAsync({
        contaId,
        extratoId: itemExcluir.id,
      });

      setModalExcluir(false);
      setItemExcluir(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const getOrigemBadge = (origem: string) => {
    const badges: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      TRANSACAO_MANUAL: { label: "Transação", variant: "default" },
      TRANSFERENCIA: { label: "Transferência", variant: "secondary" },
      AJUSTE: { label: "Ajuste", variant: "outline" },
      ESTORNO: { label: "Estorno", variant: "destructive" },
      PAGAMENTO_FATURA: { label: "Pag. Fatura", variant: "default" },
    };

    const badge = badges[origem] || { label: origem, variant: "outline" as const };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  // Card de movimentação para mobile
  const MovimentacaoCard = ({ item }: { item: MovimentacaoExtrato }) => (
    <Card className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {getOrigemBadge(item.origem)}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(item.data).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white">{item.descricao}</p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setItemExcluir(item);
                  setModalExcluir(true);
                }}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Valor</p>
            <p className={`font-semibold ${
              item.tipo === "entrada" 
                ? "text-green-600 dark:text-green-400" 
                : "text-red-600 dark:text-red-400"
            }`}>
              {item.tipo === "entrada" ? "+" : "-"} {formatarMoeda(item.valor)}
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Saldo após</p>
            <p className={`font-semibold ${
              item.saldoApos >= 0 
                ? "text-gray-900 dark:text-white" 
                : "text-red-600 dark:text-red-400"
            }`}>
              {formatarMoeda(item.saldoApos)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Extrato da Conta
            </h1>
            {contaNome && (
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">{contaNome}</p>
            )}
          </div>
        </div>

        <Button variant="outline" disabled className="hidden md:flex dark:border-gray-700">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Resumo do Período */}
      {resumo && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl text-gray-900 dark:text-white">
              Resumo do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Saldo Inicial
                </p>
                <p className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                  {formatarMoeda(resumo.saldoInicial)}
                </p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Entradas
                </p>
                <p className="text-base md:text-lg font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {formatarMoeda(resumo.totalEntradas)}
                </p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Saídas
                </p>
                <p className="text-base md:text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  {formatarMoeda(resumo.totalSaidas)}
                </p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Variação
                </p>
                <p
                  className={`text-base md:text-lg font-bold ${
                    (resumo.saldoFinal - resumo.saldoInicial) >= 0 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {(resumo.saldoFinal - resumo.saldoInicial) >= 0 ? "+" : ""}
                  {formatarMoeda(resumo.saldoFinal - resumo.saldoInicial)}
                </p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Saldo Final
                </p>
                <p className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                  {formatarMoeda(resumo.saldoFinal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <FiltrosExtrato
        filtros={filtros}
        onFiltrosChange={setFiltros}
      />

      {/* Error State */}
      {error && (
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400 font-medium mb-2">
              Erro ao carregar extrato
            </p>
            <p className="text-sm text-red-500 dark:text-red-400 mb-4">
              {error.message}
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
              className="border-red-300 dark:border-red-700 dark:bg-red-950 dark:hover:bg-red-900"
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && extrato.length === 0 && (
        <Card className="border-dashed dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">
              Nenhuma movimentação encontrada
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Tente ajustar os filtros ou período selecionado
            </p>
          </CardContent>
        </Card>
      )}

      {/* Vista Mobile - Cards */}
      {!loading && !error && extrato.length > 0 && (
        <div className="md:hidden space-y-3">
          {extrato.map((item) => (
            <MovimentacaoCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Vista Desktop - Tabela */}
      {!loading && !error && extrato.length > 0 && (
        <Card className="hidden md:block dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-white">
                      Data
                    </th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-white">
                      Descrição
                    </th>
                    <th className="text-center p-3 font-medium text-gray-900 dark:text-white">
                      Origem
                    </th>
                    <th className="text-right p-3 font-medium text-gray-900 dark:text-white">
                      Entrada
                    </th>
                    <th className="text-right p-3 font-medium text-gray-900 dark:text-white">
                      Saída
                    </th>
                    <th className="text-right p-3 font-medium text-gray-900 dark:text-white">
                      Saldo
                    </th>
                    <th className="text-center p-3 font-medium text-gray-900 dark:text-white w-16">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {extrato.map((item) => (
                    <tr 
                      key={item.id} 
                      className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3 whitespace-nowrap text-gray-900 dark:text-gray-200">
                        {new Date(item.data).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-3 text-gray-900 dark:text-gray-200">
                        <div className="max-w-md">{item.descricao}</div>
                      </td>
                      <td className="p-3 text-center">{getOrigemBadge(item.origem)}</td>
                      <td className="p-3 text-right font-medium text-green-600 dark:text-green-400">
                        {item.tipo === "entrada" && `+ ${formatarMoeda(item.valor)}`}
                      </td>
                      <td className="p-3 text-right font-medium text-red-600 dark:text-red-400">
                        {item.tipo === "saida" && `- ${formatarMoeda(item.valor)}`}
                      </td>
                      <td
                        className={`p-3 text-right font-semibold ${
                          item.saldoApos >= 0 
                            ? "text-gray-900 dark:text-white" 
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {formatarMoeda(item.saldoApos)}
                      </td>
                      <td className="p-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setItemExcluir(item);
                                setModalExcluir(true);
                              }}
                              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Exclusão */}
      <ModalExcluirExtrato
        open={modalExcluir}
        onClose={() => {
          setModalExcluir(false);
          setItemExcluir(null);
        }}
        item={itemExcluir}
        onConfirmar={handleExcluir}
      />
    </div>
  );
}