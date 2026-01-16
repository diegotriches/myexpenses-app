"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Pencil, 
  Trash2, 
  FileText, 
  CreditCard, 
  AlertCircle, 
  TrendingUp, 
  MoreVertical,
  Power,
  PowerOff
} from "lucide-react";
import { Cartao } from "@/types/cartao";
import { useRouter } from "next/navigation";
import { empresaOptions, bandeiraOptions } from "@/utils/cartaoOptions";

interface Props {
  cartao: Cartao;
  onEditar: (cartao: Cartao) => void;
  onExcluir: (cartao: Cartao) => void;
  onFatura?: (cartaoId: number) => void;
  onToggleAtivo?: (cartao: Cartao) => void;
}

function getImgFromOption(options: any[], value: string) {
  const found = options.find((o) => o.value === value);
  return found ? found.imgSrc : null;
}

export default function CartaoItem({
  cartao,
  onEditar,
  onExcluir,
  onFatura,
  onToggleAtivo,
}: Props) {
  const router = useRouter();

  const empresaImg = getImgFromOption(empresaOptions, cartao.empresa ?? "");
  const bandeiraImg = getImgFromOption(bandeiraOptions, cartao.bandeira);

  // Formatação monetária brasileira
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Formatação compacta para valores grandes (ex: R$ 12,5 mil)
  const formatarMoedaCompacta = (valor: number) => {
    if (valor >= 1000000) {
      return `R$ ${(valor / 1000000).toFixed(1)} mi`;
    }
    if (valor >= 10000) {
      return `R$ ${(valor / 1000).toFixed(1)} mil`;
    }
    return formatarMoeda(valor);
  };

  const limiteTotal = Number(cartao.limite) || 0;
  const totalEmUso = Number(cartao.emUso) || 0;
  const limiteDisponivel = Number(cartao.limiteDisponivel) || 0;
  
  const porcentagemUso = limiteTotal > 0 ? (totalEmUso / limiteTotal) * 100 : 0;

  const getCorBarra = (percentual: number): string => {
    if (percentual < 50) return "bg-green-500 dark:bg-green-600";
    if (percentual < 80) return "bg-yellow-500 dark:bg-yellow-600";
    return "bg-red-500 dark:bg-red-600";
  };

  const getCorTexto = (percentual: number): string => {
    if (percentual < 50) return "text-green-700 dark:text-green-400";
    if (percentual < 80) return "text-yellow-700 dark:text-yellow-400";
    return "text-red-700 dark:text-red-400";
  };

  const hoje = new Date().getDate();
  const diaVencimento = Number(cartao.diaVencimento) || 0;
  const diasAteVencimento = diaVencimento >= hoje 
    ? diaVencimento - hoje 
    : (30 - hoje) + diaVencimento;
  const vencimentoProximo = diasAteVencimento <= 5 && diasAteVencimento > 0;

  const diaFechamento = Number(cartao.diaFechamento) || 0;
  const melhorDiaCompra = diaFechamento === 30 ? 1 : diaFechamento + 1;

  const abrirFatura = () => {
    if (onFatura) return onFatura(cartao.id);
    router.push(`/cartoes/${cartao.id}/fatura`);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 dark:border-gray-700">
      <CardContent className="p-6 space-y-4">
        {/* Header do Cartão com Menu */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {empresaImg && (
              <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-2 border dark:border-gray-700 flex-shrink-0">
                <img 
                  src={empresaImg} 
                  alt={cartao.empresa || "Empresa"} 
                  className="w-full h-full object-contain" 
                />
              </div>
            )}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-semibold text-gray-900 dark:text-white truncate">
                  {cartao.nome}
                </span>
                <Badge 
                  variant={cartao.ativo ? "default" : "secondary"}
                  className={`flex-shrink-0 ${cartao.ativo 
                    ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400"
                  }`}
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

          <div className="flex items-center gap-2 flex-shrink-0">
            {bandeiraImg && (
              <div className="w-12 h-12 flex items-center justify-center">
                <img 
                  src={bandeiraImg} 
                  alt={cartao.bandeira} 
                  className="w-full h-full object-contain" 
                />
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => onEditar(cartao)}
                  className="cursor-pointer"
                >
                  <Pencil size={14} className="mr-2" />
                  Editar cartão
                </DropdownMenuItem>

                {onToggleAtivo && (
                  <DropdownMenuItem 
                    onClick={() => onToggleAtivo(cartao)}
                    className="cursor-pointer"
                  >
                    {cartao.ativo ? (
                      <>
                        <PowerOff size={14} className="mr-2" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <Power size={14} className="mr-2" />
                        Ativar
                      </>
                    )}
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem 
                  onClick={() => onExcluir(cartao)}
                  className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  <Trash2 size={14} className="mr-2" />
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
              <div className="text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Fecha dia</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{cartao.diaFechamento}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Vence dia</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{cartao.diaVencimento}</p>
              </div>
            </div>

            {/* Limites - CORRIGIDO */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center p-2 sm:p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-900 min-w-0">
                      <p className="text-[10px] sm:text-xs font-medium text-blue-700 dark:text-blue-300 mb-1 truncate">
                        Limite Total
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-100 truncate">
                        {formatarMoedaCompacta(limiteTotal)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">{formatarMoeda(limiteTotal)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center p-2 sm:p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-900 min-w-0">
                      <p className="text-[10px] sm:text-xs font-medium text-orange-700 dark:text-orange-300 mb-1 truncate">
                        Em Uso
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-orange-900 dark:text-orange-100 truncate">
                        {formatarMoedaCompacta(totalEmUso)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">{formatarMoeda(totalEmUso)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-900 min-w-0">
                      <p className="text-[10px] sm:text-xs font-medium text-green-700 dark:text-green-300 mb-1 truncate">
                        Disponível
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-green-900 dark:text-green-100 truncate">
                        {formatarMoedaCompacta(limiteDisponivel)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">{formatarMoeda(limiteDisponivel)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Barra de Progresso */}
            <div className="space-y-2">
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${getCorBarra(porcentagemUso)}`}
                  style={{ width: `${Math.min(porcentagemUso, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <span className={`font-semibold ${getCorTexto(porcentagemUso)}`}>
                  {porcentagemUso.toFixed(1)}% utilizado
                </span>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 cursor-help">
                        <TrendingUp size={12} />
                        <span className="whitespace-nowrap">Melhor dia: {melhorDiaCompra}</span>
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

            {/* Botão Fatura em Destaque */}
            <Button
              onClick={abrirFatura}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
              size="lg"
            >
              <FileText size={16} className="mr-2" />
              Ver Fatura Atual
            </Button>
          </>
        )}

        {/* Botão Fatura para Cartão de Débito */}
        {cartao.tipo === "debito" && onFatura && (
          <Button
            onClick={abrirFatura}
            variant="outline"
            className="w-full hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 dark:hover:bg-purple-950 dark:hover:border-purple-800"
            size="lg"
          >
            <FileText size={16} className="mr-2" />
            Ver Movimentações
          </Button>
        )}
      </CardContent>
    </Card>
  );
}