"use client";

import { useState } from "react";
import MovimentacaoLinha from "./MovimentacaoLinha";
import { Transacao } from "@/types/transacao";
import { Cartao } from "@/types/cartao";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useEstabelecimentos } from "@/hooks/useEstabelecimentos";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Props {
  movimentacoes: Transacao[];
  loading: boolean;
  cartoes: Cartao[];
  onEditar: (mov: Transacao) => void;
  onExcluir: (mov: Transacao) => void;
  // ✅ NOVO: função opcional que decide se uma transação está bloqueada
  // (faz parte de uma antecipação pendente) — repassada pra cada
  // MovimentacaoLinha pra desabilitar editar/excluir
  isBloqueada?: (mov: Transacao) => boolean;
}

export default function MovimentacaoTabela({
  movimentacoes,
  loading,
  cartoes,
  onEditar,
  onExcluir,
  isBloqueada,
}: Props) {
  const { data: estabelecimentos = [] } = useEstabelecimentos();
  // Abaixo de 1536 px, Condição e Estabelecimento entram nas colunas Pagamento e
  // Descrição: com as 10 colunas, a descrição ficava com ~145 px em 1366 px
  const colunasCompletas = useMediaQuery("(min-width: 1536px)");
  // Só um painel de detalhes aberto por vez; clicar de novo na mesma fecha
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const alternar = (id: string) => setAbertaId((atual) => (atual === id ? null : id));

  // Esqueleto no formato das linhas reais: quando os dados chegam, ocupam o mesmo espaço
  // e a página não muda de altura
  if (loading) {
    return (
      <div role="status" aria-label="Carregando movimentações">
        {/* 📱 MOBILE: cartões como os de MovimentacaoLinha */}
        <div className="md:hidden space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="py-0 gap-0 dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="p-3 flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 💻 DESKTOP: cabeçalho e linhas com a altura das reais */}
        <Card className="hidden md:block dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="h-[41px] bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" />
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[57px] px-3 flex items-center gap-6">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1 max-w-[260px]" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (movimentacoes.length === 0) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-600">
              <ArrowUpCircle className="h-8 w-8" />
              <ArrowDownCircle className="h-8 w-8" />
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              Nenhuma movimentação encontrada
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Adicione uma nova movimentação para começar
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* 📱 MOBILE: cards */}
      <div className="md:hidden space-y-2 motion-safe:animate-conteudo-in">
        {movimentacoes.map((mov) => {
          const cartao         = cartoes.find((c) => c.id === mov.cartaoId) || null;
          const estabelecimento = mov.estabelecimentoId
            ? estabelecimentos.find((e) => e.id === mov.estabelecimentoId) ?? null
            : null;
          return (
            <MovimentacaoLinha
              key={mov.id}
              mov={mov}
              cartao={cartao}
              estabelecimento={estabelecimento}
              onEditar={() => onEditar(mov)}
              onExcluir={() => onExcluir(mov)}
              viewMode="card"
              bloqueada={isBloqueada ? isBloqueada(mov) : false}
              aberta={abertaId === mov.id}
              onAlternar={() => alternar(mov.id)}
              movimentacoes={movimentacoes}
            />
          );
        })}
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total de registros:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {movimentacoes.length} movimentação{movimentacoes.length !== 1 ? "ões" : ""}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 💻 DESKTOP: tabela */}
      <Card className="hidden md:block dark:bg-gray-900 dark:border-gray-800 motion-safe:animate-conteudo-in">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className={`w-full table-fixed ${colunasCompletas ? "min-w-[1180px]" : "min-w-[880px]"}`}>
              <colgroup>
                <col className="w-[88px]" />
                <col />
                <col className="w-[100px]" />
                <col className="w-[125px]" />
                <col className="w-[96px]" />
                <col className="w-[105px]" />
                {colunasCompletas && <col className="w-[108px]" />}
                <col className="w-[115px]" />
                {colunasCompletas && <col className="w-[120px]" />}
                <col className="w-[60px]" />
              </colgroup>

              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Data</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Descrição</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Categoria</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Valor</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Pagamento</th>
                  {colunasCompletas && <th className="text-left px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Condição</th>}
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Conta/Cartão</th>
                  {colunasCompletas && <th className="text-left px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Estabelecimento</th>}
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>

              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {movimentacoes.map((mov) => {
                  const cartao         = cartoes.find((c) => c.id === mov.cartaoId) || null;
                  const estabelecimento = mov.estabelecimentoId
                    ? estabelecimentos.find((e) => e.id === mov.estabelecimentoId) ?? null
                    : null;
                  return (
                    <MovimentacaoLinha
                      key={mov.id}
                      mov={mov}
                      cartao={cartao}
                      estabelecimento={estabelecimento}
                      onEditar={() => onEditar(mov)}
                      onExcluir={() => onExcluir(mov)}
                      viewMode="table"
                      colunasCompletas={colunasCompletas}
                      bloqueada={isBloqueada ? isBloqueada(mov) : false}
                      aberta={abertaId === mov.id}
                      onAlternar={() => alternar(mov.id)}
                      movimentacoes={movimentacoes}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total de registros:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {movimentacoes.length} movimentação{movimentacoes.length !== 1 ? "ões" : ""}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}