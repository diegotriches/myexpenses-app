"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCartoes } from "@/hooks/useCartoes";
import { CreditCard, Calendar, AlertCircle, Wallet } from "lucide-react";

interface Props {
  form: {
    cartaoId: string;
    valor: string;
  };
  update: (key: string, value: any) => void;
  // ✅ NOVA PROP: Permite renderizar o info box fora do componente
  renderInfoBox?: (content: React.ReactNode) => React.ReactNode;
  // ✅ NOVA PROP: Permite esconder o select (quando queremos apenas o info box)
  hideSelect?: boolean;
}

export default function MovCampoCartao({ form, update, renderInfoBox, hideSelect = false }: Props) {
  const { data: cartoes = [], isLoading } = useCartoes();

  const cartoesAtivos = cartoes.filter((c) => c.ativo);

  const cartaoSelecionado = cartoesAtivos.find(
    (c) => String(c.id) === form.cartaoId
  );

  const limiteProjetado = cartaoSelecionado && cartaoSelecionado.tipo === "credito"
    ? Number(cartaoSelecionado.limiteDisponivel) - (parseFloat(form.valor) || 0)
    : null;

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const calcularPercentualUso = (disponivel: number | string, limite: number | string) => {
    const disponivelNum = Number(disponivel);
    const limiteNum = Number(limite);
    if (limiteNum === 0) return 0;
    return ((limiteNum - disponivelNum) / limiteNum) * 100;
  };

  if (isLoading && !hideSelect) {
    return (
      <div>
        <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
          Cartão
        </label>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
      </div>
    );
  }

  // ✅ INFO BOX - Renderizado separadamente
  const infoBoxContent = cartaoSelecionado && (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 space-y-2">
      {cartaoSelecionado.tipo === "credito" ? (
        <>
          {form.valor && parseFloat(form.valor) > 0 && (
            <>
              {/* Layout Horizontal com mais espaço */}
              <div className="flex gap-2">
                {/* Limite Disponível */}
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-md p-3 text-center">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                    Disponível
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatarMoeda(Number(cartaoSelecionado.limiteDisponivel))}
                  </div>
                </div>

                {/* Esta Compra */}
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-md p-3 text-center">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                    Esta compra
                  </div>
                  <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    -{formatarMoeda(parseFloat(form.valor))}
                  </div>
                </div>

                {/* Limite Após */}
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-md p-3 text-center">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                    Após compra
                  </div>
                  <div 
                    className={`text-sm font-bold ${
                      limiteProjetado! >= 0 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatarMoeda(limiteProjetado!)}
                  </div>
                </div>
              </div>

              {/* Alerta de limite excedido */}
              {limiteProjetado! < 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-red-800 dark:text-red-300">
                    Esta compra ultrapassará o limite do cartão
                  </span>
                </div>
              )}
            </>
          )}

          {/* Info de vencimento */}
          {cartaoSelecionado.diaVencimento && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-2 flex items-start gap-2">
              <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-purple-800 dark:text-purple-300">
                <p className="font-medium">Cartão de crédito</p>
                <p className="mt-0.5">
                  O valor será cobrado na fatura. Vencimento: dia {cartaoSelecionado.diaVencimento}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-2 flex items-start gap-2">
          <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 dark:text-blue-300">
            <p className="font-medium">Cartão de débito</p>
            <p className="mt-0.5">
              O valor será descontado imediatamente da conta vinculada ao cartão
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // ✅ Se hideSelect = true, renderiza APENAS o info box
  if (hideSelect) {
    return renderInfoBox && cartaoSelecionado ? <>{renderInfoBox(infoBoxContent)}</> : null;
  }

  return (
    <>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Cartão
        </label>

        <Select
          value={form.cartaoId}
          onValueChange={(v) => update("cartaoId", v)}
        >
          <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
            <SelectValue placeholder="Selecione o cartão">
              {cartaoSelecionado && (
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                      cartaoSelecionado.tipo === "credito" 
                        ? "bg-purple-600" 
                        : "bg-blue-600"
                    }`}
                  >
                    {cartaoSelecionado.tipo === "credito" ? (
                      <CreditCard className="h-4 w-4" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        {cartaoSelecionado.nome}
                      </span>
                      <span 
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          cartaoSelecionado.tipo === "credito"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}
                      >
                        {cartaoSelecionado.tipo === "credito" ? "Crédito" : "Débito"}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {cartaoSelecionado.tipo === "credito" 
                        ? `${formatarMoeda(Number(cartaoSelecionado.limiteDisponivel))} disponível`
                        : `${cartaoSelecionado.empresa} • ${cartaoSelecionado.bandeira}`
                      }
                    </span>
                  </div>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>

          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            {cartoesAtivos.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhum cartão disponível
              </div>
            ) : (
              cartoesAtivos.map((cartao) => {
                const isCredito = cartao.tipo === "credito";
                const percentualUso = isCredito 
                  ? calcularPercentualUso(cartao.limiteDisponivel, cartao.limite)
                  : 0;

                return (
                  <SelectItem 
                    key={cartao.id} 
                    value={String(cartao.id)}
                    className="dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3 py-1">
                      <div 
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${
                          isCredito ? "bg-purple-600" : "bg-blue-600"
                        }`}
                      >
                        {isCredito ? (
                          <CreditCard className="h-5 w-5" />
                        ) : (
                          <Wallet className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate max-w-[150px] text-gray-900 dark:text-white">
                            {cartao.nome}
                          </span>
                          <span 
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              isCredito
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            }`}
                          >
                            {isCredito ? "Crédito" : "Débito"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{cartao.bandeira}</span>
                          <span>•</span>
                          <span>{cartao.empresa}</span>
                          {isCredito && cartao.diaVencimento && (
                            <>
                              <span>•</span>
                              <span>Venc. dia {cartao.diaVencimento}</span>
                            </>
                          )}
                        </div>
                        
                        {isCredito && (
                          <div className="w-full mt-1">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-gray-500 dark:text-gray-400">
                                {formatarMoeda(Number(cartao.limiteDisponivel))} disponível
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {percentualUso.toFixed(0)}% usado
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                              <div
                                className={`h-1 rounded-full transition-all ${
                                  percentualUso > 80
                                    ? "bg-red-500"
                                    : percentualUso > 50
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{ width: `${Math.min(percentualUso, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                );
              })
            )}
          </SelectContent>
        </Select>
      </div>

      {/* ✅ Renderiza info box - callback se fornecido, senão não renderiza nada aqui */}
      {renderInfoBox && cartaoSelecionado && renderInfoBox(infoBoxContent)}
    </>
  );
}