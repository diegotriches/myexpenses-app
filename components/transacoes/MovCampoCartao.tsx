"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCartoes } from "@/hooks/useCartoes";
import { useContas } from "@/hooks/useContas";
import { TrendingDown } from "lucide-react";
import { empresaOptions } from "@/utils/cartaoOptions";
import { CreditCard, AlertCircle, Wallet } from "lucide-react";
import { useHideValues } from "@/contexts/HideValuesContext";
import { formatarMoeda } from "@/utils/formatadores";

interface Props {
  form: {
    cartaoId: string;
    valor: string;
  };
  update: (k: "cartaoId", v: string) => void;
  renderInfoBox?: (content: React.ReactNode) => React.ReactNode;
  hideSelect?: boolean;
  error?: string;
  disabled?: boolean;
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
  const dim = size === "sm" ? "w-6 h-6" : "w-10 h-10";
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
  disabled = false,
}: Props) {
  const { mask } = useHideValues();
  const { data: cartoes = [], isLoading } = useCartoes();
  const cartoesAtivos = cartoes.filter((c) => c.ativo);
  const cartaoSelecionado = cartoesAtivos.find((c) => String(c.id) === form.cartaoId);
  const limiteProjetado =
    cartaoSelecionado && cartaoSelecionado.tipo === "credito"
      ? Number(cartaoSelecionado.limiteDisponivel) - (parseFloat(form.valor) || 0)
      : null;

  const { data: contas = [] } = useContas();
  const contaVinculada = cartaoSelecionado?.tipo === "debito" && cartaoSelecionado.contaVinculadaId
    ? contas.find((c) => c.id === cartaoSelecionado.contaVinculadaId) ?? null
    : null;

  if (isLoading && !hideSelect) {
    return (
      <div>
        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Cartão</label>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
      </div>
    );
  }

  const infoBoxContent = cartaoSelecionado && (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 space-y-2">
      {cartaoSelecionado.tipo === "debito" && contaVinculada && form.valor && parseFloat(form.valor) > 0 && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Saldo atual:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {mask(formatarMoeda(Number(contaVinculada.saldoAtual)))}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
              <span>Despesa:</span>
            </div>
            <span className="font-medium text-red-600 dark:text-red-400">
              -{formatarMoeda(parseFloat(form.valor))}
            </span>
          </div>
          <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Saldo projetado:</span>
            <span className={`font-semibold ${Number(contaVinculada.saldoAtual) - parseFloat(form.valor) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {mask(formatarMoeda(Number(contaVinculada.saldoAtual) - parseFloat(form.valor)))}
            </span>
          </div>
          {Number(contaVinculada.saldoAtual) - parseFloat(form.valor) < 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-2 flex items-start gap-2">
              <Wallet className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-yellow-800 dark:text-yellow-300">
                Esta transação deixará sua conta com saldo negativo
              </span>
            </div>
          )}
        </>
      )}
      {cartaoSelecionado.tipo === "credito" && form.valor && parseFloat(form.valor) > 0 && (
        <>
          <div className="flex gap-2">
            <div className="flex-1 bg-white dark:bg-gray-900 rounded-md p-3 text-center">
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Disponível</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {mask(formatarMoeda(Number(cartaoSelecionado.limiteDisponivel)))}
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
                {mask(formatarMoeda(limiteProjetado!))}
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cartão</label>
        <Select value={form.cartaoId} onValueChange={(v) => update("cartaoId", v)} disabled={disabled}>
          <SelectTrigger size="lg" className={`w-full dark:bg-gray-800 dark:border-gray-700 ${triggerErrorClass}`}>
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