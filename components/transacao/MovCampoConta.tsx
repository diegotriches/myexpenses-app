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
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";
import { empresaOptions } from "@/utils/cartaoOptions";
import Image from "next/image";

interface Props {
  form: {
    contaId: string;
    tipo: "entrada" | "saida";
    valor: string;
  };
  update: (k: string, v: any) => void;
  renderInfoBox?: (content: React.ReactNode) => React.ReactNode;
  hideSelect?: boolean;
  error?: string;
  valorOriginal?: number; // valor da transação antes da edição (undefined = criação)
}

export default function MovCampoConta({
  form,
  update,
  renderInfoBox,
  hideSelect = false,
  error,
  valorOriginal,
}: Props) {
  const { data: contas = [], isLoading, error: queryError } = useContas();

  const contasAtivas = contas.filter((c) => c.ativo);
  const contaSelecionada = contasAtivas.find((c) => c.id === form.contaId);
  const saldoAtual = contaSelecionada ? Number(contaSelecionada.saldoAtual) : 0;
  const valorNovo = parseFloat(form.valor) || 0;

  // No modo edição, o saldo atual já reflete a transação original.
  // O impacto líquido é apenas a diferença entre o novo e o antigo valor.
  // Ex: despesa R$15 → R$10: impacto = -10 - (-15) = +5 → saldo sobe R$5
  // Ex: despesa R$15 → R$20: impacto = -20 - (-15) = -5 → saldo cai R$5
  const isEdicao = valorOriginal !== undefined;

  const impactoLiquido = (() => {
    if (!contaSelecionada) return 0;
    if (isEdicao) {
      const impactoNovo    = form.tipo === "entrada" ?  valorNovo    : -valorNovo;
      const impactoAntigo  = form.tipo === "entrada" ?  valorOriginal : -valorOriginal;
      return impactoNovo - impactoAntigo;
    }
    return form.tipo === "entrada" ? valorNovo : -valorNovo;
  })();

  const saldoProjetado = contaSelecionada ? saldoAtual + impactoLiquido : null;

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const getBancoImg = (banco?: string | null) => {
    if (!banco) return null;
    return empresaOptions.find((e) => e.value === banco)?.imgSrc ?? null;
  };

  if (isLoading && !hideSelect) {
    return (
      <div>
        <Label className="text-gray-900 dark:text-white">Conta</Label>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
      </div>
    );
  }

  if (queryError && !hideSelect) {
    return (
      <div>
        <Label className="text-gray-900 dark:text-white">Conta</Label>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-red-800 dark:text-red-300">
            {queryError instanceof Error ? queryError.message : "Erro ao carregar contas"}
          </span>
        </div>
      </div>
    );
  }

  // Label e cor da linha de impacto
  const impactoLabel = isEdicao
    ? impactoLiquido >= 0 ? "Ajuste (redução):" : "Ajuste (aumento):"
    : form.tipo === "entrada" ? "Receita:" : "Despesa:";

  const impactoPositivo = impactoLiquido >= 0;

  const infoBoxContent = contaSelecionada && valorNovo > 0 && (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Saldo atual:</span>
        <span className="font-medium text-gray-900 dark:text-white">{formatarMoeda(saldoAtual)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
          {impactoPositivo
            ? <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
            : <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
          }
          <span>{impactoLabel}</span>
        </div>
        <span className={`font-medium ${impactoPositivo ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {impactoLiquido >= 0 ? "+" : ""}{formatarMoeda(impactoLiquido)}
        </span>
      </div>
      <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 dark:text-white">Saldo projetado:</span>
        <span className={`font-semibold ${saldoProjetado! >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {formatarMoeda(saldoProjetado!)}
        </span>
      </div>
      {saldoProjetado! < 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-2 flex items-start gap-2">
          <Wallet className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-yellow-800 dark:text-yellow-300">
            Esta transação deixará sua conta com saldo negativo
          </span>
        </div>
      )}
    </div>
  );

  if (hideSelect) {
    return renderInfoBox && infoBoxContent ? <>{renderInfoBox(infoBoxContent)}</> : null;
  }

  const triggerErrorClass = error
    ? "border-red-500 dark:border-red-500 focus:ring-red-500"
    : "";

  return (
    <>
      <div className="space-y-2">
        <Label className="text-gray-900 dark:text-white">Conta</Label>
        <Select value={form.contaId} onValueChange={(v) => update("contaId", v)}>
          <SelectTrigger className={`dark:bg-gray-800 dark:border-gray-700 ${triggerErrorClass}`}>
            <SelectValue placeholder="Selecione a conta">
              {contaSelecionada && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    {getBancoImg(contaSelecionada.banco) ? (
                      <Image src={getBancoImg(contaSelecionada.banco)!} alt={contaSelecionada.banco || "Banco"} width={32} height={32} className="object-contain" />
                    ) : (
                      <span className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                        {contaSelecionada.nome.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{contaSelecionada.nome}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatarMoeda(saldoAtual)}</span>
                  </div>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            {contasAtivas.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma conta cadastrada</div>
            ) : (
              contasAtivas.map((conta) => {
                const bancoImg = getBancoImg(conta.banco);
                const saldoConta = Number(conta.saldoAtual);
                return (
                  <SelectItem key={conta.id} value={conta.id} className="dark:hover:bg-gray-700">
                    <div className="flex items-center gap-3 py-1">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                        {bancoImg ? (
                          <Image src={bancoImg} alt={conta.banco || "Banco"} width={40} height={40} className="object-contain" />
                        ) : (
                          <span className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                            {conta.nome.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-medium text-sm truncate max-w-[200px] text-gray-900 dark:text-white">{conta.nome}</span>
                        <div className="flex items-center gap-1">
                          {conta.banco && (
                            <><span className="text-xs text-gray-500 dark:text-gray-400">{conta.banco}</span><span className="text-xs text-gray-500 dark:text-gray-400">•</span></>
                          )}
                          <span className={`text-xs font-medium ${saldoConta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {formatarMoeda(saldoConta)}
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
        {error && <p className="text-xs text-red-500 flex items-center gap-1">⚠ {error}</p>}
      </div>
      {renderInfoBox && infoBoxContent && renderInfoBox(infoBoxContent)}
    </>
  );
}