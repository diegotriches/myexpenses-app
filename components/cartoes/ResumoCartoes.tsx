"use client";

import { useMemo } from "react";
import { useGastosAnuaisCartoes } from "@/hooks/useCartoes";
import { CheckCircle2, Receipt, Gauge, Wallet } from "lucide-react";
import { useFaturasAbertas } from "@/hooks/useDashboard";
import type { Cartao } from "@/types/cartao";
import { useMoeda } from "@/hooks/useMoeda";
import { KpiCard } from "@/components/common/KpiCard";

interface Props {
  cartoes: Cartao[];
}

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** "YYYY-MM-DD" (ou ISO) -> "dd/mm", sem passar por fuso horário */
function diaMes(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return ano && mes && dia ? `${dia}/${mes}` : "";
}

export default function ResumoCartoes({ cartoes }: Props) {
  const fmt = useMoeda();

  const anoAtual = new Date().getFullYear();

  // 1) Pago no ano — mesma queryKey do card de gastos anuais da dashboard
  const gastos = useGastosAnuaisCartoes(anoAtual);

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

  // Uso do limite: o valor só ganha cor quando passa de 50% (âmbar) ou 80% (vermelho)
  const tomValorLimite = limite.pct >= 80 ? "negativo" : limite.pct >= 50 ? "alerta" : "neutro";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
      <KpiCard
        titulo={`Pago em ${anoAtual}`}
        valor={fmt(gastos.data?.totalPago ?? 0)}
        icone={CheckCircle2}
        tom="verde"
        detalhe="em faturas pagas no ano"
        carregando={gastos.isLoading}
        erro={gastos.isError}
      />
      <KpiCard
        titulo="Faturas em aberto"
        valor={fmt(emAberto.total)}
        icone={Receipt}
        tom={emAberto.atrasadas > 0 ? "vermelho" : "azul"}
        tomValor={emAberto.atrasadas > 0 ? "negativo" : "neutro"}
        detalhe={
          emAberto.quantidade === 0
            ? "Nenhuma fatura em aberto"
            : emAberto.atrasadas > 0
              ? `${plural(emAberto.atrasadas, "atrasada", "atrasadas")} · ${plural(emAberto.quantidade, "fatura", "faturas")}`
              : `${plural(emAberto.quantidade, "fatura", "faturas")}${emAberto.proximoVenc ? ` · vence ${diaMes(emAberto.proximoVenc)}` : ""}`
        }
        carregando={faturas.isLoading}
        erro={faturas.isError}
      />
      <KpiCard
        titulo="Limite utilizado"
        valor={fmt(limite.emUso)}
        icone={Gauge}
        tom="roxo"
        tomValor={tomValorLimite}
        detalhe={limite.total > 0 ? `${limite.pct.toFixed(0)}% de ${fmt(limite.total)}` : "Sem limite cadastrado"}
      />
      <KpiCard
        titulo="Limite disponível"
        valor={fmt(limite.disponivel)}
        icone={Wallet}
        tom="verde"
        detalhe={
          limite.total > 0
            ? `${plural(limite.quantidade, "cartão", "cartões")} · ${(100 - Math.min(100, limite.pct)).toFixed(0)}% livre`
            : "Sem limite cadastrado"
        }
      />
    </div>
  );
}
