"use client";

import { useMemo } from "react";
import { Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgenda } from "@/hooks/useAgenda";
import { useMoeda } from "@/hooks/useMoeda";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { projetarFimDoMes } from "@/utils/agendaUtils";

export function CardFimDoMes() {
  const { faturas, recorrencias, saldoContas, carregando, erroRecorrencias, erroContas } = useAgenda();
  const fmt = useMoeda();
  const hoje = hojeBrt();

  const p = useMemo(
    () => projetarFimDoMes({ saldoAtual: saldoContas, faturas, recorrencias, hoje }),
    [saldoContas, faturas, recorrencias, hoje],
  );
  const [, mesFim, diaFim] = p.fimDoMes.split("-");
  const positivo = p.saldoPrevisto >= 0;

  const linhas: { rotulo: string; valor: number; sinal: "+" | "−" | ""; cor: string; mostrar: boolean }[] = [
    { rotulo: "Saldo em contas hoje", valor: p.saldoAtual, sinal: "", cor: "text-gray-900 dark:text-white", mostrar: true },
    { rotulo: "Faturas a vencer no mês", valor: p.faturas, sinal: "−", cor: "text-red-600 dark:text-red-400", mostrar: p.faturas > 0 },
    { rotulo: "Recorrências a receber", valor: p.entradasPrevistas, sinal: "+", cor: "text-green-600 dark:text-green-400", mostrar: p.entradasPrevistas > 0 },
    { rotulo: "Recorrências a pagar", valor: p.saidasPrevistas, sinal: "−", cor: "text-red-600 dark:text-red-400", mostrar: p.saidasPrevistas > 0 },
  ];

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-gray-900 dark:text-white">
          <span className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Fim do mês
          </span>
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">até {diaFim}/{mesFim}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {carregando ? (
          <>
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : erroContas ? (
          <p className="text-sm text-red-500">Não foi possível carregar o saldo das contas.</p>
        ) : (
          <>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Saldo previsto em contas</p>
              <p className={`text-2xl font-bold ${positivo ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {fmt(p.saldoPrevisto)}
              </p>
            </div>
            <div className="space-y-2 text-sm">
              {linhas.filter((l) => l.mostrar).map((l) => (
                <div key={l.rotulo} className="flex items-center justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">{l.rotulo}</span>
                  <span className={`font-medium whitespace-nowrap ${l.cor}`}>
                    {l.sinal && `${l.sinal} `}{fmt(l.valor)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
              Estimativa. Lançamentos com data futura já estão no saldo; compras e recorrências no cartão entram pela fatura.
            </p>
            {erroRecorrencias && (
              <p className="text-xs text-amber-600 dark:text-amber-400">Recorrências indisponíveis: a previsão considera só as faturas.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
