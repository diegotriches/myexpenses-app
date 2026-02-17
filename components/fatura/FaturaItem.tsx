"use client";

import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, Tag, TrendingDown } from "lucide-react";
import { TransacaoFatura } from "@/types/cartao";
import { formatarDataCurta } from "@/utils/dateUtils";
import { iconOptions } from "@/utils/iconOptions";
import { useCategorias } from "@/hooks/useCategorias";

interface Props {
  transacao: TransacaoFatura;
}

export default function FaturaItem({ transacao }: Props) {
  // ✅ Busca categorias do cache React Query (sem fetch extra — já está em cache)
  const { data: categorias = [] } = useCategorias();

  const formatarMoeda = (valor: number | string) => {
    const v = typeof valor === "string" ? parseFloat(valor) : valor;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v);
  };

  const valorNum =
    typeof transacao.valor === "string"
      ? parseFloat(transacao.valor)
      : transacao.valor;

  const isParcelado = transacao.parcelas && transacao.parcelas > 1;
  const valorParcela = isParcelado ? valorNum / transacao.parcelas! : valorNum;

  // ✅ Busca categoria pelo nome para obter ícone e tipo
  const categoriaObj = categorias.find(
    (c) => c.nome.toLowerCase() === transacao.categoria?.toLowerCase()
  );

  // ✅ Resolve o componente do ícone via iconOptions
  const IconeCategoria = categoriaObj?.icone
    ? iconOptions.find((i) => i.name === categoriaObj.icone)?.component ?? null
    : null;

  // ✅ Gradiente baseado no tipo da categoria
  const gradiente = (() => {
    switch (categoriaObj?.tipo) {
      case "entrada": return "from-green-500 to-green-600";
      case "saida":   return "from-red-500 to-red-600";
      default:        return "from-gray-400 to-gray-500";
    }
  })();

  return (
    <div className="group p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
      <div className="flex items-start justify-between gap-4">

        {/* ── LEFT ── */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Ícone da categoria */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${gradiente}`}>
            {IconeCategoria
              ? <IconeCategoria size={18} className="text-white" />
              : <Tag size={18} className="text-white" />
            }
          </div>

          {/* Informações */}
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-white truncate">
                {transacao.descricao || "Sem descrição"}
              </span>

              {isParcelado && (
                <Badge
                  variant="outline"
                  className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900"
                >
                  <CreditCard size={10} className="mr-1" />
                  {transacao.parcelaAtual}/{transacao.parcelas}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
              {transacao.categoria && (
                <div className="flex items-center gap-1">
                  <Tag size={11} />
                  <span>{transacao.categoria}</span>
                </div>
              )}
              {transacao.data && (
                <div className="flex items-center gap-1">
                  <Calendar size={11} />
                  <span>{formatarDataCurta(transacao.data)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1">
            <TrendingDown size={15} className="text-red-500 dark:text-red-400" />
            <span className="font-bold text-base text-red-600 dark:text-red-400">
              {formatarMoeda(valorNum)}
            </span>
          </div>

          {isParcelado && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {transacao.parcelas}x de {formatarMoeda(valorParcela)}
            </span>
          )}
        </div>
      </div>

      {/* ── Rodapé parcelamento ── */}
      {isParcelado && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Parcela {transacao.parcelaAtual} de {transacao.parcelas}</span>
            <span className="font-semibold">{formatarMoeda(valorParcela)} / parcela</span>
          </div>
        </div>
      )}
    </div>
  );
}