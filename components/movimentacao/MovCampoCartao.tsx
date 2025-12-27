"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCartoes } from "@/hooks/useCartoes";
import { CreditCard, Calendar } from "lucide-react";

interface Props {
  form: {
    cartaoId: string;
    valor: string;
  };
  update: (key: string, value: any) => void;
}

export default function MovCampoCartao({ form, update }: Props) {
  const { cartoes, loading } = useCartoes();

  // Filtrar apenas cartões de crédito ativos
  const cartoesCredito = cartoes.filter(
    (c) => c.tipo === "credito" && c.ativo
  );

  const cartaoSelecionado = cartoesCredito.find(
    (c) => String(c.id) === form.cartaoId
  );

  // Calcula limite disponível após a compra
  const limiteProjetado = cartaoSelecionado
    ? cartaoSelecionado.limiteDisponivel - (parseFloat(form.valor) || 0)
    : null;

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const calcularPercentualUso = (disponivel: number, limite: number) => {
    return ((limite - disponivel) / limite) * 100;
  };

  if (loading) {
    return (
      <div>
        <label className="block mb-1 text-sm font-medium">Cartão</label>
        <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Cartão</label>

      <Select
        value={form.cartaoId}
        onValueChange={(v) => update("cartaoId", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione o cartão">
            {cartaoSelecionado && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-600 text-white">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">
                    {cartaoSelecionado.nome}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatarMoeda(cartaoSelecionado.limiteDisponivel)}{" "}
                    disponível
                  </span>
                </div>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {cartoesCredito.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum cartão de crédito disponível
            </div>
          ) : (
            cartoesCredito.map((cartao) => {
              const percentualUso = calcularPercentualUso(
                cartao.limiteDisponivel,
                cartao.limite
              );

              return (
                <SelectItem key={cartao.id} value={String(cartao.id)}>
                  <div className="flex items-center gap-3 py-1">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-600 text-white flex-shrink-0">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="font-medium text-sm truncate max-w-[200px]">
                        {cartao.nome}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{cartao.bandeira}</span>
                        <span>•</span>
                        <span>Venc. dia {cartao.diaVencimento}</span>
                      </div>
                      <div className="w-full mt-1">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-muted-foreground">
                            {formatarMoeda(cartao.limiteDisponivel)} disponível
                          </span>
                          <span className="text-muted-foreground">
                            {percentualUso.toFixed(0)}% usado
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1">
                          <div
                            className={`h-1 rounded-full transition-all ${
                              percentualUso > 80
                                ? "bg-red-500"
                                : percentualUso > 50
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${percentualUso}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>

      {/* Info do limite projetado */}
      {cartaoSelecionado && form.valor && parseFloat(form.valor) > 0 && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Limite disponível:</span>
            <span className="font-medium">
              {formatarMoeda(cartaoSelecionado.limiteDisponivel)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Esta compra:</span>
            <span className="font-medium text-purple-600">
              -{formatarMoeda(parseFloat(form.valor))}
            </span>
          </div>

          <div className="border-t pt-2 flex items-center justify-between">
            <span className="text-sm font-medium">Limite após compra:</span>
            <span
              className={`font-semibold ${
                limiteProjetado! >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatarMoeda(limiteProjetado!)}
            </span>
          </div>

          {/* Alerta se ultrapassar o limite */}
          {limiteProjetado! < 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2 flex items-start gap-2">
              <CreditCard className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red-800">
                Esta compra ultrapassará o limite do cartão
              </span>
            </div>
          )}

          {/* Info sobre vencimento */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-2 flex items-start gap-2">
            <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-blue-800">
              Vencimento da fatura: dia {cartaoSelecionado.diaVencimento}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}