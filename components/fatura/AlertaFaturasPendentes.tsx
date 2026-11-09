// src/components/fatura/AlertaFaturasPendentes.tsx
"use client";

import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import type { FaturaPendente } from "@/hooks/useFaturasPendentes";
import { useHideValues } from "@/contexts/HideValuesContext";

const meses = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const mesesAbreviados = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface Props {
  cartaoId: string | number;
  cartaoNome?: string;
  pendentes: FaturaPendente[];
  isLoading?: boolean;
  compacto?: boolean;
  /** Quando definido, clica no Ver sem navegar — apenas atualiza o seletor */
  onVerFatura?: (mes: number, ano: number) => void;
}

export default function AlertaFaturasPendentes({
  cartaoId,
  cartaoNome,
  pendentes,
  isLoading = false,
  compacto = false,
  onVerFatura,
}: Props) {
  const { mask } = useHideValues();
  const router = useRouter();

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const handleVerFatura = (pendente: FaturaPendente) => {
    if (onVerFatura) {
      // Ja esta na FaturaPage — atualiza o seletor diretamente
      onVerFatura(pendente.mes - 1, pendente.ano); // mes 0-11
    } else {
      // Vindo de outra pagina — navega normalmente
      router.push("/cartoes/" + cartaoId + "/fatura?mes=" + pendente.mes + "&ano=" + pendente.ano);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-2">
        <Loader2 size={14} className="animate-spin" />
        <span>Verificando faturas pendentes...</span>
      </div>
    );
  }

  if (pendentes.length === 0) return null;

  const temAtrasada = pendentes.some((p) => p.status === "ATRASADA");
  const totalPendente = pendentes.reduce((acc, p) => acc + p.total, 0);

  if (compacto) {
    return (
      <Alert className={"py-3 " + (temAtrasada
        ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"
        : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900"
      )}>
        <AlertTriangle className={"h-4 w-4 flex-shrink-0 mt-0.5 " + (temAtrasada
          ? "text-red-600 dark:text-red-400"
          : "text-yellow-600 dark:text-yellow-400"
        )} />
        <AlertDescription className="w-full">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={"text-xs font-semibold " + (temAtrasada
                ? "text-red-800 dark:text-red-300"
                : "text-yellow-800 dark:text-yellow-300"
              )}>
                {cartaoNome && <span>{cartaoNome} — </span>}
                {pendentes.length === 1
                  ? "Fatura de " + mesesAbreviados[pendentes[0].mes - 1] + "/" + pendentes[0].ano + " em aberto"
                  : pendentes.length + " faturas em aberto"
                }
              </p>
              <p className={"text-xs mt-0.5 " + (temAtrasada
                ? "text-red-700 dark:text-red-400"
                : "text-yellow-700 dark:text-yellow-400"
              )}>
                Total: {mask(formatarMoeda(totalPendente))}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleVerFatura(pendentes[0])}
              className={"h-7 text-xs flex-shrink-0 " + (temAtrasada
                ? "border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                : "border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
              )}
            >
              Ver
              <ChevronRight size={12} className="ml-1" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={temAtrasada
      ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"
      : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900"
    }>
      <AlertTriangle className={"h-4 w-4 flex-shrink-0 mt-0.5 " + (temAtrasada
        ? "text-red-600 dark:text-red-400"
        : "text-yellow-600 dark:text-yellow-400"
      )} />
      <AlertDescription className="w-full">
        <p className={"text-sm font-semibold mb-2 " + (temAtrasada
          ? "text-red-800 dark:text-red-300"
          : "text-yellow-800 dark:text-yellow-300"
        )}>
          {pendentes.length === 1
            ? "Você tem 1 fatura não paga"
            : "Você tem " + pendentes.length + " faturas não pagas"
          }
        </p>

        <div className="space-y-2">
          {pendentes.map((pendente) => (
            <div
              key={pendente.mes + "-" + pendente.ano}
              className={"flex items-center justify-between gap-3 p-2.5 rounded-lg " + (temAtrasada
                ? "bg-red-100/60 dark:bg-red-900/20"
                : "bg-yellow-100/60 dark:bg-yellow-900/20"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge className={"text-xs flex-shrink-0 " + (pendente.status === "ATRASADA"
                  ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300"
                  : "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                )}>
                  {pendente.status === "ATRASADA" ? "Atrasada" : "Em aberto"}
                </Badge>

                <div className="min-w-0">
                  <span className={"text-xs font-medium " + (temAtrasada
                    ? "text-red-800 dark:text-red-300"
                    : "text-yellow-800 dark:text-yellow-300"
                  )}>
                    {meses[pendente.mes - 1]} {pendente.ano}
                  </span>
                  <span className={"text-xs ml-2 " + (temAtrasada
                    ? "text-red-600 dark:text-red-400"
                    : "text-yellow-600 dark:text-yellow-400"
                  )}>
                    {mask(formatarMoeda(pendente.total))}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleVerFatura(pendente)}
                className={"h-7 text-xs flex-shrink-0 " + (pendente.status === "ATRASADA"
                  ? "border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  : "border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
                )}
              >
                Ver
                <ChevronRight size={12} className="ml-1" />
              </Button>
            </div>
          ))}
        </div>

        {pendentes.length > 1 && (
          <p className={"text-xs font-semibold mt-2 pt-2 border-t " + (temAtrasada
            ? "border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
            : "border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300"
          )}>
            Total pendente: {mask(formatarMoeda(totalPendente))}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}