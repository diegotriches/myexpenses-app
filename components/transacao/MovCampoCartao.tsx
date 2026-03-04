"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCartoes } from "@/hooks/useCartoes";
import { empresaOptions } from "@/utils/cartaoOptions";
import { CreditCard, Calendar, AlertCircle, Wallet } from "lucide-react";

interface Props {
  form: {
    cartaoId: string;
    valor: string;
  };
  update: (key: string, value: any) => void;
  renderInfoBox?: (content: React.ReactNode) => React.ReactNode;
  hideSelect?: boolean;
  error?: string;
}

function CartaoIcone({
  empresa,
  tipo,
  size = "md",
}: {
  empresa: string;
  tipo: "credito" | "debito";
  size?: "sm" | "md";
}) {
  const imgSrc = empresaOptions.find((e) => e.value === empresa)?.imgSrc;
  const dim = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  if (imgSrc) {
    return <img src={imgSrc} alt={empresa} className={`${dim} object-contain rounded-lg flex-shrink-0`} />;
  }

  return (
    <div className={`${dim} rounded-lg flex items-center justify-center text-white flex-shrink-0 ${tipo === "credito" ? "bg-purple-600" : "bg-blue-600"}`}>
      {tipo === "credito" ? <CreditCard className={iconSize} /> : <Wallet className={iconSize} />}
    </div>
  );
}

export default function MovCampoCartao({
  form,
  update,
  renderInfoBox,
  hideSelect = false,
  error,
}: Props) {
  const { data: cartoes = [], isLoading } = useCartoes();
  const cartoesAtivos = cartoes.filter((c) => c.ativo);
  const cartaoSelecionado = cartoesAtivos.find((c) => String(c.id) === form.cartaoId);
  const limiteProjetado =
    cartaoSelecionado && cartaoSelecionado.tipo === "credito"
      ? Number(cartaoSelecionado.limiteDisponivel) - (parseFloat(form.valor) || 0)
      : null;

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  if (isLoading && !hideSelect) {
    return (
      <div>
        <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Cartão</label>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
      </div>
    );
  }

  const infoBoxContent = cartaoSelecionado && (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 space-y-2">
      {cartaoSelecionado.tipo === "credito" ? (
        <>
          {form.valor && parseFloat(form.valor) > 0 && (
            <>
              <div className="flex gap-2">
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-md p-3 text-center">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Disponível</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatarMoeda(Number(cartaoSelecionado.limiteDisponivel))}
                  </div>
                </div>
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-md p-3 text-center">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Esta compra</div>
                  <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    -{formatarMoeda(parseFloat(form.valor))}
                  </div>
                </div>
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-md p-3 text-center">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Após compra</div>
                  <div className={`text-sm font-bold ${limiteProjetado! >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {formatarMoeda(limiteProjetado!)}
                  </div>
                </div>
              </div>
              {limiteProjetado! < 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-red-800 dark:text-red-300">Esta compra ultrapassará o limite do cartão</span>
                </div>
              )}
            </>
          )}
          {cartaoSelecionado.diaVencimento && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-2 flex items-start gap-2">
              <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-purple-800 dark:text-purple-300">
                <p className="font-medium">Cartão de crédito</p>
                <p className="mt-0.5">O valor será cobrado na fatura. Vencimento: dia {cartaoSelecionado.diaVencimento}</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-2 flex items-start gap-2">
          <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 dark:text-blue-300">
            <p className="font-medium">Cartão de débito</p>
            <p className="mt-0.5">O valor será descontado imediatamente da conta vinculada ao cartão</p>
          </div>
        </div>
      )}
    </div>
  );

  if (hideSelect) {
    return renderInfoBox && cartaoSelecionado ? <>{renderInfoBox(infoBoxContent)}</> : null;
  }

  const triggerErrorClass = error
    ? "border-red-500 dark:border-red-500 focus:ring-red-500"
    : "";

  return (
    <>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">Cartão</label>
        <Select value={form.cartaoId} onValueChange={(v) => update("cartaoId", v)}>
          <SelectTrigger className={`dark:bg-gray-800 dark:border-gray-700 ${triggerErrorClass}`}>
            <SelectValue placeholder="Selecione o cartão">
              {cartaoSelecionado && (
                <div className="flex items-center gap-2">
                  <CartaoIcone empresa={cartaoSelecionado.empresa} tipo={cartaoSelecionado.tipo} size="sm" />
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{cartaoSelecionado.nome}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${cartaoSelecionado.tipo === "credito" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}>
                      {cartaoSelecionado.tipo === "credito" ? "Crédito" : "Débito"}
                    </span>
                  </div>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            {cartoesAtivos.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Nenhum cartão disponível</div>
            ) : (
              cartoesAtivos.map((cartao) => {
                const isCredito = cartao.tipo === "credito";
                return (
                  <SelectItem key={cartao.id} value={String(cartao.id)} className="dark:hover:bg-gray-700">
                    <div className="flex items-center gap-3 py-1">
                      <CartaoIcone empresa={cartao.empresa} tipo={cartao.tipo} size="md" />
                      <div className="flex flex-col items-start min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate max-w-[150px] text-gray-900 dark:text-white">{cartao.nome}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${isCredito ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}>
                            {isCredito ? "Crédito" : "Débito"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{cartao.bandeira}</span>
                          <span>•</span>
                          <span>{cartao.empresa}</span>
                          {isCredito && cartao.diaVencimento && (
                            <><span>•</span><span>Venc. dia {cartao.diaVencimento}</span></>
                          )}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })
            )}
          </SelectContent>
        </Select>
        {error && <p className="text-xs text-red-500 flex items-center gap-1">⚠ {error}</p>}
      </div>
      {renderInfoBox && cartaoSelecionado && renderInfoBox(infoBoxContent)}
    </>
  );
}