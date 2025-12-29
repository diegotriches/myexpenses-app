"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, Trash2, FileText, CreditCard, AlertCircle, TrendingUp } from "lucide-react";
import { Cartao } from "@/types/cartao";
import { useRouter } from "next/navigation";
import { empresaOptions, bandeiraOptions } from "@/utils/cartaoOptions";

interface Props {
  cartao: Cartao;
  movimentacoes: { valor: number | string; cartaoId: number }[];
  onEditar: (cartao: Cartao) => void;
  onExcluir: (cartao: Cartao) => void;
  onFatura?: (cartaoId: number) => void;
}

function getImgFromOption(options: any[], value: string) {
  const found = options.find((o) => o.value === value);
  return found ? found.imgSrc : null;
}

export default function CartaoItem({
  cartao,
  movimentacoes = [],
  onEditar,
  onExcluir,
  onFatura,
}: Props) {
  const router = useRouter();
  const movsSeguros = Array.isArray(movimentacoes) ? movimentacoes : [];

  const empresaImg = getImgFromOption(empresaOptions, cartao.empresa ?? "");
  const bandeiraImg = getImgFromOption(bandeiraOptions, cartao.bandeira);

  // Formatação monetária brasileira
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Cálculo de Em Uso
  const totalEmUso = movsSeguros
    .filter((mov) => mov.cartaoId === cartao.id)
    .reduce((total, mov) => total + Number(mov.valor ?? 0), 0);

  const limiteTotal = Number(cartao.limite) || 0;
  const limiteDisponivel = limiteTotal - totalEmUso;
  const porcentagemUso = limiteTotal > 0 ? (totalEmUso / limiteTotal) * 100 : 0;

  // Cor da barra baseada no uso
  const getCorBarra = (percentual: number): string => {
    if (percentual < 50) return "bg-green-500";
    if (percentual < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getCorTexto = (percentual: number): string => {
    if (percentual < 50) return "text-green-700";
    if (percentual < 80) return "text-yellow-700";
    return "text-red-700";
  };

  // Verifica vencimento próximo (próximos 5 dias)
  const hoje = new Date().getDate();
  const diaVencimento = Number(cartao.diaVencimento) || 0;
  const diasAteVencimento = diaVencimento >= hoje 
    ? diaVencimento - hoje 
    : (30 - hoje) + diaVencimento;
  const vencimentoProximo = diasAteVencimento <= 5 && diasAteVencimento > 0;

  // Melhor dia para compras (logo após fechamento)
  const diaFechamento = Number(cartao.diaFechamento) || 0;
  const melhorDiaCompra = diaFechamento === 30 ? 1 : diaFechamento + 1;

  const abrirFatura = () => {
    if (onFatura) return onFatura(cartao.id);
    router.push(`/cartoes/${cartao.id}/fatura`);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6 space-y-4">
        {/* Header do Cartão */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {empresaImg && (
              <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-2 border">
                <img 
                  src={empresaImg} 
                  alt={cartao.empresa || "Empresa"} 
                  className="w-full h-full object-contain" 
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-gray-900 dark:text-white">
                  {cartao.nome}
                </span>
                <Badge 
                  variant={cartao.ativo ? "default" : "secondary"}
                  className={cartao.ativo 
                    ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                  }
                >
                  {cartao.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              
              {cartao.tipo && (
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <CreditCard size={12} />
                  <span>{cartao.tipo === "credito" ? "Crédito" : "Débito"}</span>
                </div>
              )}
            </div>
          </div>

          {bandeiraImg && (
            <div className="w-12 h-12 flex items-center justify-center">
              <img 
                src={bandeiraImg} 
                alt={cartao.bandeira} 
                className="w-full h-full object-contain" 
              />
            </div>
          )}
        </div>

        {cartao.tipo === "credito" && (
          <>
            {/* Alertas */}
            {vencimentoProximo && (
              <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-900 rounded-lg">
                <AlertCircle size={16} className="text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <p className="text-xs text-orange-800 dark:text-orange-200">
                  Vencimento em {diasAteVencimento} {diasAteVencimento === 1 ? "dia" : "dias"}
                </p>
              </div>
            )}

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
              <div className="text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Fecha dia</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{cartao.diaFechamento}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Vence dia</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{cartao.diaVencimento}</p>
              </div>
            </div>

            {/* Limites */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-900">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                  Limite Total
                </p>
                <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                  {formatarMoeda(limiteTotal)}
                </p>
              </div>

              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-900">
                <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                  Em Uso
                </p>
                <p className="text-sm font-bold text-orange-900 dark:text-orange-100">
                  {formatarMoeda(totalEmUso)}
                </p>
              </div>

              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-900">
                <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                  Disponível
                </p>
                <p className="text-sm font-bold text-green-900 dark:text-green-100">
                  {formatarMoeda(limiteDisponivel)}
                </p>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="space-y-2">
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${getCorBarra(porcentagemUso)}`}
                  style={{ width: `${Math.min(porcentagemUso, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${getCorTexto(porcentagemUso)}`}>
                  {porcentagemUso.toFixed(1)}% utilizado
                </span>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 cursor-help">
                        <TrendingUp size={12} />
                        <span>Melhor dia: {melhorDiaCompra}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Compre no dia {melhorDiaCompra} para pagar só no próximo mês
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </>
        )}

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditar(cartao)}
            className="flex-1 min-w-[100px] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-950"
          >
            <Pencil size={14} className="mr-2" />
            Editar
          </Button>

          {cartao.tipo === "credito" && (
            <Button
              variant="outline"
              size="sm"
              onClick={abrirFatura}
              className="flex-1 min-w-[100px] hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 dark:hover:bg-purple-950"
            >
              <FileText size={14} className="mr-2" />
              Fatura
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onExcluir(cartao)}
            className="flex-1 min-w-[100px] hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950"
          >
            <Trash2 size={14} className="mr-2" />
            Remover
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}