"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContas } from "@/hooks/useContas";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { empresaOptions } from "@/utils/cartaoOptions";
import Image from "next/image";

interface Props {
  form: {
    contaId: string;
    tipo: "entrada" | "saida";
    valor: string;
  };
  update: (k: string, v: any) => void;
}

export default function MovCampoConta({ form, update }: Props) {
  const { contas, loading, error } = useContas();

  // Filtrar apenas contas bancárias (não cartões de crédito)
  const contasBancarias = contas.filter((c) => c.tipo === "BANCARIA");

  const contaSelecionada = contasBancarias.find((c) => c.id === form.contaId);
  
  // Obtém o saldo da conta
  const saldoAtual = contaSelecionada?.saldoAtual ?? 0;

  // Calcula o saldo projetado após a transação
  const saldoProjetado = contaSelecionada
    ? form.tipo === "entrada"
      ? saldoAtual + (parseFloat(form.valor) || 0)
      : saldoAtual - (parseFloat(form.valor) || 0)
    : null;

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  // Busca a imagem do banco
  const getBancoImg = (banco?: string | null) => {
    if (!banco) return null;
    const empresa = empresaOptions.find((e) => e.value === banco);
    return empresa?.imgSrc;
  };

  if (loading) {
    return (
      <div>
        <Label>Conta</Label>
        <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Label>Conta</Label>
        <div className="text-red-500 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Conta</Label>

      <Select value={form.contaId} onValueChange={(v) => update("contaId", v)}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione a conta">
            {contaSelecionada && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                  {getBancoImg(contaSelecionada.banco) ? (
                    <Image
                      src={getBancoImg(contaSelecionada.banco)!}
                      alt={contaSelecionada.banco || "Banco"}
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  ) : (
                    <span className="font-semibold text-sm text-muted-foreground">
                      {contaSelecionada.nome.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">
                    {contaSelecionada.nome}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatarMoeda(saldoAtual)}
                  </span>
                </div>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {contasBancarias.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma conta bancária cadastrada
            </div>
          ) : (
            contasBancarias.map((conta) => {
              const bancoImg = getBancoImg(conta.banco);
              
              return (
                <SelectItem key={conta.id} value={conta.id}>
                  <div className="flex items-center gap-3 py-1">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted overflow-hidden flex-shrink-0">
                      {bancoImg ? (
                        <Image
                          src={bancoImg}
                          alt={conta.banco || "Banco"}
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                      ) : (
                        <span className="font-semibold text-sm text-muted-foreground">
                          {conta.nome.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="font-medium text-sm truncate max-w-[200px]">
                        {conta.nome}
                      </span>
                      <div className="flex items-center gap-1">
                        {conta.banco && (
                          <>
                            <span className="text-xs text-muted-foreground">
                              {conta.banco}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                          </>
                        )}
                        <span
                          className={`text-xs font-medium ${
                            conta.saldoAtual >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatarMoeda(conta.saldoAtual)}
                        </span>
                      </div>
                    </div>
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>

      {/* Info do saldo projetado */}
      {contaSelecionada && form.valor && parseFloat(form.valor) > 0 && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Saldo atual:</span>
            <span className="font-medium">
              {formatarMoeda(saldoAtual)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              {form.tipo === "entrada" ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span>{form.tipo === "entrada" ? "Receita" : "Despesa"}:</span>
            </div>
            <span
              className={`font-medium ${
                form.tipo === "entrada" ? "text-green-600" : "text-red-600"
              }`}
            >
              {form.tipo === "entrada" ? "+" : "-"}
              {formatarMoeda(parseFloat(form.valor))}
            </span>
          </div>

          <div className="border-t pt-2 flex items-center justify-between">
            <span className="text-sm font-medium">Saldo projetado:</span>
            <span
              className={`font-semibold ${
                saldoProjetado! >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatarMoeda(saldoProjetado!)}
            </span>
          </div>

          {/* Alerta se o saldo ficar negativo */}
          {saldoProjetado! < 0 && form.tipo === "saida" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 flex items-start gap-2">
              <Wallet className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-yellow-800">
                Esta transação deixará sua conta com saldo negativo
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}