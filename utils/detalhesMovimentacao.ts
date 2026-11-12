// Informações extras do painel de detalhes da movimentação, calculadas só com
// o que a listagem do mês já traz (a própria linha e as outras do mês)
import type { Transacao } from "@/types/transacao";
import type { Cartao } from "@/types/cartao";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";
import { adicionarMeses } from "@/utils/dateUtils";

export interface ResumoParcelamento {
  atual: number;
  total: number;
  /** Parcelas depois desta */
  restantes: number;
  /** Data prevista da última parcela: as parcelas são mensais a partir da primeira */
  ultimaParcela: Date;
}

export function resumoParcelamento(
  mov: Pick<Transacao, "parcelado" | "parcelas" | "parcelaAtual" | "data">,
): ResumoParcelamento | null {
  if (!mov.parcelado || !mov.parcelas || !mov.parcelaAtual) return null;
  const total = mov.parcelas;
  const atual = Math.min(mov.parcelaAtual, total);
  return {
    atual,
    total,
    restantes: total - atual,
    ultimaParcela: adicionarMeses(new Date(mov.data), total - atual),
  };
}

/** Fatura em que a compra no crédito caiu, pelo mesmo cálculo da API (`calcularFaturaDaTransacao`). */
export function faturaDaMovimentacao(
  mov: Pick<Transacao, "formaPagamento" | "data">,
  cartao: Pick<Cartao, "tipo" | "diaFechamento"> | null,
): { mes: number; ano: number } | null {
  if (mov.formaPagamento !== "cartao" || !cartao || cartao.tipo !== "credito") return null;
  return calcularFaturaDaTransacao(new Date(mov.data), cartao.diaFechamento || 1);
}

/** Estornos lançados contra a compra, entre as movimentações carregadas. */
export function estornosDaCompra(compraId: string, lista: Transacao[]): Transacao[] {
  return lista.filter((t) => t.tipo === "estorno" && t.estornoDeId === compraId);
}

/** Compra de origem do estorno, se ela estiver entre as movimentações carregadas. */
export function compraDoEstorno(estorno: Transacao, lista: Transacao[]): Transacao | null {
  if (estorno.tipo !== "estorno" || !estorno.estornoDeId) return null;
  return lista.find((t) => t.id === estorno.estornoDeId) ?? null;
}

/** Só conta como alterada se a última gravação veio mais de um minuto depois do cadastro. */
export function foiAlterada(
  createdAt: string | Date | null | undefined,
  updatedAt: string | Date | null | undefined,
): boolean {
  if (!createdAt || !updatedAt) return false;
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 60_000;
}

/** Data e hora em Brasília, ex.: "10/11/2026 às 14:32". */
export function formatarDataHoraBrt(data: string | Date): string {
  const d = new Date(data);
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short" }).format(d);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", timeStyle: "short" }).format(d);
  return `${dia} às ${hora}`;
}
