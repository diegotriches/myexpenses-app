"use client";

import { Badge } from "@/components/ui/badge";
import { 
  ShoppingBag, 
  Repeat, 
  CreditCard,
  Calendar,
  Tag,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Transacao } from "@/types/transacao";

interface Props {
  transacao: Transacao;
}

export default function FaturaItem({ transacao }: Props) {
  // Formatação monetária
  const formatarMoeda = (valor: number | string) => {
    const valorNum = typeof valor === 'string' ? parseFloat(valor) : valor;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valorNum);
  };

  // Formatação de data
  const formatarData = (data: string) => {
    try {
      const date = new Date(data);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return data;
    }
  };

  // Ícone da categoria
  const getCategoriaIcon = () => {
    const categoria = transacao.categoria?.toLowerCase() || "";
    
    if (categoria.includes("alimentação") || categoria.includes("restaurante")) {
      return "🍔";
    }
    if (categoria.includes("transporte")) {
      return "🚗";
    }
    if (categoria.includes("saúde")) {
      return "💊";
    }
    if (categoria.includes("educação")) {
      return "📚";
    }
    if (categoria.includes("lazer") || categoria.includes("entretenimento")) {
      return "🎬";
    }
    if (categoria.includes("compras") || categoria.includes("mercado")) {
      return "🛒";
    }
    return "💳";
  };

  const valorNum = typeof transacao.valor === 'string' 
    ? parseFloat(transacao.valor) 
    : transacao.valor;

  return (
    <div className="group p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
      <div className="flex items-start justify-between gap-4">
        {/* Left Section */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Ícone da Categoria */}
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-xl">
            {getCategoriaIcon()}
          </div>

          {/* Informações */}
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {/* Descrição */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-white truncate">
                {transacao.descricao || "Sem descrição"}
              </span>
              
              {/* Badges de Tipo */}
              {transacao.parcelado && (
                <Badge 
                  variant="outline" 
                  className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900"
                >
                  <CreditCard size={10} className="mr-1" />
                  {transacao.parcelaAtual}/{transacao.parcelas}
                </Badge>
              )}
              
              {transacao.recorrente && (
                <Badge 
                  variant="outline" 
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900"
                >
                  <Repeat size={10} className="mr-1" />
                  Recorrente
                </Badge>
              )}
            </div>

            {/* Categoria e Data */}
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              {transacao.categoria && (
                <div className="flex items-center gap-1">
                  <Tag size={12} />
                  <span>{transacao.categoria}</span>
                </div>
              )}
              
              {transacao.data && (
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>{formatarData(transacao.data)}</span>
                </div>
              )}
            </div>

            {/* Informações Adicionais - Mobile */}
            <div className="flex md:hidden items-center gap-2 mt-1">
              {transacao.formaPagamento && (
                <Badge variant="secondary" className="text-xs">
                  {transacao.formaPagamento}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Valor */}
          <div className="flex items-center gap-1">
            {transacao.tipo === "saida" ? (
              <TrendingDown size={16} className="text-red-600 dark:text-red-400" />
            ) : (
              <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
            )}
            <span
              className={`font-bold text-lg ${
                transacao.tipo === "saida"
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {transacao.tipo === "saida" ? "-" : "+"} {formatarMoeda(valorNum)}
            </span>
          </div>

          {/* Forma de Pagamento - Desktop */}
          {transacao.formaPagamento && (
            <Badge 
              variant="secondary" 
              className="hidden md:flex text-xs capitalize"
            >
              {transacao.formaPagamento}
            </Badge>
          )}
        </div>
      </div>

      {/* Detalhes Parcelamento - Expandido */}
      {transacao.parcelado && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Valor da parcela</span>
            <span className="font-semibold">
              {formatarMoeda(valorNum)} de {formatarMoeda(valorNum * (transacao.parcelas || 1))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}