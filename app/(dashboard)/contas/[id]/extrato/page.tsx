"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

import FiltrosExtrato, { FiltrosExtratoState } from "@/components/extrato/FiltrosExtrato";
import ModalExcluirExtrato from "@/components/extrato/ModalExcluirExtrato";

interface ExtratoItem {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  descricao: string;
  valor: number;
  saldoApos: number;
  origem: "TRANSACAO_MANUAL" | "PAGAMENTO_FATURA" | "TRANSFERENCIA" | "AJUSTE" | "ESTORNO";
  referenciaId?: string | null;
}

interface ResumoExtrato {
  contaId: string;
  contaNome: string;
  saldoInicial: number;
  saldoFinal: number;
  totalEntradas: number;
  totalSaidas: number;
  variacao: number;
  periodo: {
    inicio: string;
    fim: string;
  };
}

export default function ExtratoContaPage() {
  const params = useParams();
  const router = useRouter();
  const contaId = params?.id as string;

  const [extrato, setExtrato] = useState<ExtratoItem[]>([]);
  const [resumo, setResumo] = useState<ResumoExtrato | null>(null);
  const [contaNome, setContaNome] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Modal de exclusão
  const [modalExcluir, setModalExcluir] = useState(false);
  const [itemExcluir, setItemExcluir] = useState<ExtratoItem | null>(null);

  // Filtros
  const [filtros, setFiltros] = useState<FiltrosExtratoState>({
    inicio: "",
    fim: "",
    tipo: "TODOS",
    origem: "TODAS",
  });

  const carregarExtrato = useCallback(async () => {
    setLoading(true);

    try {
      const query = new URLSearchParams();
      if (filtros.inicio) query.append("inicio", filtros.inicio);
      if (filtros.fim) query.append("fim", filtros.fim);
      if (filtros.tipo !== "TODOS") query.append("tipo", filtros.tipo);
      if (filtros.origem !== "TODAS") query.append("origem", filtros.origem);

      const res = await fetch(`/api/contas/${contaId}/extrato?${query.toString()}`);

      if (!res.ok) {
        throw new Error("Erro ao carregar extrato");
      }

      const data = await res.json();

      setExtrato(data.extrato ?? []);
      setResumo(data.resumo ?? null);
      setContaNome(data.contaNome ?? "");
    } catch (error) {
      console.error("Erro ao carregar extrato:", error);
    } finally {
      setLoading(false);
    }
  }, [contaId, filtros]);

  useEffect(() => {
    if (contaId) {
      carregarExtrato();
    }
  }, [contaId, carregarExtrato]);

  const handleExcluir = async () => {
    if (!itemExcluir) return;

    try {
      const res = await fetch(`/api/contas/${contaId}/extrato/${itemExcluir.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Erro ao excluir lançamento");
      }

      // Recarrega o extrato
      await carregarExtrato();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert(error instanceof Error ? error.message : "Erro ao excluir lançamento");
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

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Extrato da Conta
            </h1>
            {contaNome && (
              <p className="text-muted-foreground dark:text-gray-400">{contaNome}</p>
            )}
          </div>
        </div>

        <Button variant="outline" disabled>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Resumo do Período */}
      {resumo && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Período</CardTitle>
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              {new Date(resumo.periodo.inicio).toLocaleDateString("pt-BR")} até{" "}
              {new Date(resumo.periodo.fim).toLocaleDateString("pt-BR")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Saldo Inicial</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  R$ {resumo.saldoInicial.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Entradas</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  + R$ {resumo.totalEntradas.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Saídas</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  - R$ {resumo.totalSaidas.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Variação</p>
                <p
                  className={`text-lg font-bold ${
                    resumo.variacao >= 0 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {resumo.variacao >= 0 ? "+" : ""} R$ {resumo.variacao.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Saldo Final</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  R$ {resumo.saldoFinal.toFixed(2)}
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
        onAplicar={carregarExtrato}
      />

      {/* Tabela de Extrato */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted dark:bg-gray-800">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-900 dark:text-white">Data</th>
                  <th className="text-left p-3 font-medium text-gray-900 dark:text-white">Descrição</th>
                  <th className="text-center p-3 font-medium text-gray-900 dark:text-white">Origem</th>
                  <th className="text-right p-3 font-medium text-gray-900 dark:text-white">Entrada</th>
                  <th className="text-right p-3 font-medium text-gray-900 dark:text-white">Saída</th>
                  <th className="text-right p-3 font-medium text-gray-900 dark:text-white">Saldo</th>
                  <th className="text-center p-3 font-medium text-gray-900 dark:text-white w-16">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground dark:text-gray-400">
                      Carregando extrato...
                    </td>
                  </tr>
                )}

                {!loading && extrato.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground dark:text-gray-400">
                      Nenhuma movimentação encontrada no período
                    </td>
                  </tr>
                )}

                {!loading &&
                  extrato.map((item) => (
                    <tr 
                      key={item.id} 
                      className="border-t border-gray-200 dark:border-gray-700 hover:bg-muted/50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3 whitespace-nowrap text-gray-900 dark:text-gray-200">
                        {new Date(item.data).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-3 text-gray-900 dark:text-gray-200">
                        <div className="max-w-md">{item.descricao}</div>
                      </td>
                      <td className="p-3 text-center">{getOrigemBadge(item.origem)}</td>
                      <td className="p-3 text-right font-medium text-green-600 dark:text-green-400">
                        {item.tipo === "entrada" && `+ R$ ${item.valor.toFixed(2)}`}
                      </td>
                      <td className="p-3 text-right font-medium text-red-600 dark:text-red-400">
                        {item.tipo === "saida" && `- R$ ${item.valor.toFixed(2)}`}
                      </td>
                      <td
                        className={`p-3 text-right font-semibold ${
                          item.saldoApos >= 0 
                            ? "text-gray-900 dark:text-white" 
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        R$ {item.saldoApos.toFixed(2)}
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