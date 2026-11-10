"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarClock, CreditCard, Repeat, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgenda } from "@/hooks/useAgenda";
import { useMoeda } from "@/hooks/useMoeda";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { montarVencimentos } from "@/utils/agendaUtils";

const DIAS = 15;
const MAXIMO_VISIVEL = 6;

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function rotuloData(data: string, hoje: string): { dia: string; mes: string; quando: string } {
  const [ano, mes, dia] = data.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  const diff = Math.round((d.getTime() - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000);
  const quando = diff === 0 ? "hoje" : diff === 1 ? "amanhã" : diff < 0 ? `há ${-diff} dia${diff === -1 ? "" : "s"}` : DIAS_SEMANA[d.getUTCDay()];
  return {
    dia: String(dia).padStart(2, "0"),
    mes: d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", ""),
    quando,
  };
}

export function CardProximosVencimentos() {
  const { faturas, recorrencias, carregando, erroRecorrencias } = useAgenda();
  const fmt = useMoeda();
  const hoje = hojeBrt();

  const itens = useMemo(
    () => montarVencimentos({ faturas, recorrencias, hoje, dias: DIAS }),
    [faturas, recorrencias, hoje],
  );
  const aPagar = itens.filter((i) => i.sentido === "saida").reduce((s, i) => s + i.valor, 0);
  const aReceber = itens.filter((i) => i.sentido === "entrada").reduce((s, i) => s + i.valor, 0);
  const visiveis = itens.slice(0, MAXIMO_VISIVEL);

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-gray-900 dark:text-white">
          <span className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Próximos vencimentos
          </span>
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">próximos {DIAS} dias</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {carregando ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : itens.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/40 px-3 py-3">
            <CalendarClock className="w-6 h-6 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">Nada vence nos próximos {DIAS} dias</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Faturas de cartão e recorrências aparecem aqui.</p>
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {visiveis.map((item) => {
                const data = rotuloData(item.data, hoje);
                const Icone = item.origem === "fatura" ? CreditCard : Repeat;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.link}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                        item.atrasada
                          ? "border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:hover:bg-red-950/50"
                          : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="w-12 flex-shrink-0 text-center rounded-md bg-gray-100 dark:bg-gray-800 py-1">
                        <p className="text-base font-bold leading-none text-gray-900 dark:text-white">{data.dia}</p>
                        <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">{data.mes}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white truncate">
                          <Icone className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                          <span className="truncate">{item.descricao}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.atrasada ? (
                            <span className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
                              <AlertTriangle className="w-3 h-3" /> Atrasada · venceu {data.quando}
                            </span>
                          ) : (
                            `${item.detalhe} · ${data.quando}`
                          )}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold whitespace-nowrap ${
                          item.sentido === "entrada" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {item.sentido === "entrada" ? "+" : "−"} {fmt(item.valor)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {itens.length > visiveis.length && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                e mais {itens.length - visiveis.length} vencimento{itens.length - visiveis.length === 1 ? "" : "s"}
              </p>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800 text-sm">
              <span className="text-gray-500 dark:text-gray-400">A pagar</span>
              <span className="font-semibold text-red-600 dark:text-red-400">{fmt(aPagar)}</span>
            </div>
            {aReceber > 0 && (
              <div className="flex items-center justify-between text-sm -mt-1">
                <span className="text-gray-500 dark:text-gray-400">A receber</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{fmt(aReceber)}</span>
              </div>
            )}
          </>
        )}
        {erroRecorrencias && (
          <p className="text-xs text-amber-600 dark:text-amber-400">Recorrências indisponíveis: a lista mostra só as faturas.</p>
        )}
      </CardContent>
    </Card>
  );
}
