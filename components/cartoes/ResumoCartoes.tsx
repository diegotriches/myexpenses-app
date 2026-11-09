"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Receipt, Gauge, Wallet } from "lucide-react";
import { useFaturasAbertas } from "@/hooks/useDashboard";
import type { Cartao } from "@/types/cartao";
import { useMoeda } from "@/hooks/useMoeda";

interface Props {
  cartoes: Cartao[];
}

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** "YYYY-MM-DD" (ou ISO) -> "dd/mm", sem passar por fuso horário */
function diaMes(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return ano && mes && dia ? `${dia}/${mes}` : "";
}

// Classes compartilhadas — mesmo padrão compacto do CardResumo da dashboard
const CARD = "!py-0 !gap-0 border-l-4 dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow overflow-hidden";
const HEADER = "flex flex-row items-center justify-between -space-y-1 !px-3 !pt-3 !pb-1 md:!px-4 md:!pt-5 md:!pb-1.5";
const TITLE = "text-[11px] md:text-sm font-medium text-gray-900 dark:text-white leading-none md:leading-normal";
const CONTENT = "!px-3 !pt-0 !pb-3 md:!px-4 md:!pt-0 md:!pb-5";
const VALOR = "text-base md:text-2xl font-bold leading-none md:leading-normal !mb-1";
const SUB = "text-[9px] md:text-xs text-gray-500 dark:text-gray-400 leading-none md:leading-normal mt-0.5 md:mt-1.5 truncate";

export default function ResumoCartoes({ cartoes }: Props) {
  const fmt = useMoeda();

  const anoAtual = new Date().getFullYear();

  // 1) Pago no ano — mesma queryKey do card de gastos anuais da dashboard
  const gastos = useQuery<{ totalGasto: number; totalPago: number }>({
    queryKey: ["cartoes-gastos-anuais", anoAtual],
    queryFn: async () => {
      const res = await fetch(`/api/cartoes/gastos-anuais?ano=${anoAtual}`);
      if (!res.ok) throw new Error("Erro ao carregar gastos anuais");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // 2) Faturas em aberto (fatura mais urgente de cada cartão de crédito ativo)
  const faturas = useFaturasAbertas();

  const emAberto = useMemo(() => {
    const lista = faturas.data ?? [];
    const total = lista.reduce((s, f) => s + Number(f.total), 0);
    const atrasadas = lista.filter((f) => f.status === "ATRASADA").length;
    const proximoVenc = lista
      .filter((f) => f.status !== "ATRASADA" && f.dataVencimento)
      .map((f) => f.dataVencimento.slice(0, 10))
      .sort()[0];
    return { total, quantidade: lista.length, atrasadas, proximoVenc };
  }, [faturas.data]);

  // 3) Limite utilizado e disponível — cartões de crédito ativos
  const limite = useMemo(() => {
    const ativos = cartoes.filter((c) => c.tipo === "credito" && c.ativo);
    const total = ativos.reduce((s, c) => s + (Number(c.limite) || 0), 0);
    const emUso = ativos.reduce((s, c) => s + (Number(c.emUso) || 0), 0);
    const disponivel = Math.max(
      0,
      ativos.reduce((s, c) => s + (Number(c.limiteDisponivel) || 0), 0)
    );
    const pct = total > 0 ? (emUso / total) * 100 : 0;
    return { total, emUso, disponivel, pct, quantidade: ativos.length };
  }, [cartoes]);

  const corLimite =
    limite.pct >= 80
      ? { borda: "border-l-red-500 dark:border-l-red-600", texto: "text-red-600 dark:text-red-400" }
      : limite.pct >= 50
        ? { borda: "border-l-amber-500 dark:border-l-amber-600", texto: "text-amber-600 dark:text-amber-400" }
        : { borda: "border-l-purple-500 dark:border-l-purple-600", texto: "text-purple-600 dark:text-purple-400" };

  const renderCarregando = () => (
    <>
      <Skeleton className="h-4 w-20 md:h-6 md:w-32 mb-1.5" />
      <Skeleton className="h-2 w-12 md:h-3 md:w-20" />
    </>
  );

  const renderErro = () => <p className="text-xs text-red-500">Erro ao carregar</p>;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
      {/* Pago no ano */}
      <Card className={`${CARD} border-l-green-500 dark:border-l-green-600`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Pago em {anoAtual}</CardTitle>
          <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className={CONTENT}>
          {gastos.isLoading ? renderCarregando() : gastos.isError ? renderErro() : (
            <>
              <div className={`${VALOR} text-green-600 dark:text-green-400`}>
                {fmt(gastos.data?.totalPago ?? 0)}
              </div>
              <p className={SUB}>em faturas pagas no ano</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Faturas em aberto */}
      <Card className={`${CARD} ${emAberto.atrasadas > 0 ? "border-l-red-500 dark:border-l-red-600" : "border-l-blue-500 dark:border-l-blue-600"}`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Faturas em aberto</CardTitle>
          <Receipt className={`h-3 w-3 md:h-4 md:w-4 flex-shrink-0 ${emAberto.atrasadas > 0 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
        </CardHeader>
        <CardContent className={CONTENT}>
          {faturas.isLoading ? renderCarregando() : faturas.isError ? renderErro() : (
            <>
              <div className={`${VALOR} ${emAberto.atrasadas > 0 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                {fmt(emAberto.total)}
              </div>
              <p className={SUB}>
                {emAberto.quantidade === 0
                  ? "Nenhuma fatura em aberto"
                  : emAberto.atrasadas > 0
                    ? `${plural(emAberto.atrasadas, "atrasada", "atrasadas")} · ${plural(emAberto.quantidade, "fatura", "faturas")}`
                    : `${plural(emAberto.quantidade, "fatura", "faturas")}${emAberto.proximoVenc ? ` · vence ${diaMes(emAberto.proximoVenc)}` : ""}`}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Limite utilizado */}
      <Card className={`${CARD} ${corLimite.borda}`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Limite utilizado</CardTitle>
          <Gauge className={`h-3 w-3 md:h-4 md:w-4 flex-shrink-0 ${corLimite.texto}`} />
        </CardHeader>
        <CardContent className={CONTENT}>
          <div className={`${VALOR} ${corLimite.texto}`}>{fmt(limite.emUso)}</div>
          <p className={SUB}>
            {limite.total > 0
              ? `${limite.pct.toFixed(0)}% de ${fmt(limite.total)}`
              : "Sem limite cadastrado"}
          </p>
        </CardContent>
      </Card>

      {/* Limite disponível */}
      <Card className={`${CARD} border-l-emerald-500 dark:border-l-emerald-600`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Limite disponível</CardTitle>
          <Wallet className="h-3 w-3 md:h-4 md:w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className={CONTENT}>
          <div className={`${VALOR} text-emerald-600 dark:text-emerald-400`}>{fmt(limite.disponivel)}</div>
          <p className={SUB}>
            {limite.total > 0
              ? `${plural(limite.quantidade, "cartão", "cartões")} · ${(100 - Math.min(100, limite.pct)).toFixed(0)}% livre`
              : "Sem limite cadastrado"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}