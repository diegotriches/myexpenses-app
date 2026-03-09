// src/utils/faturaUtils.ts

import type { Fatura, StatusFatura } from "@/types/fatura";

// ========================================
// CÁLCULO DE FATURA E PERÍODO
// ========================================

/**
 * Calcula qual fatura (mês/ano) uma transação pertence
 * baseado na data da transação e no dia de fechamento do cartão.
 *
 * REGRA DO CICLO:
 * - Transação ANTES do dia de fechamento → Fatura do mês ATUAL
 * - Transação NO dia de fechamento ou APÓS → Fatura do PRÓXIMO mês
 *
 * @example
 * // Cartão fecha dia 10
 * calcularFaturaDaTransacao(new Date('2026-01-05'), 10) → { mes: 1, ano: 2026 }
 * calcularFaturaDaTransacao(new Date('2026-01-10'), 10) → { mes: 2, ano: 2026 }
 * calcularFaturaDaTransacao(new Date('2026-01-12'), 10) → { mes: 2, ano: 2026 }
 */
export function calcularFaturaDaTransacao(
  dataTransacao: Date | string,
  diaFechamento: number
): { mes: number; ano: number } {
  // Parseia sempre como local para evitar bug de fuso (ex: "2026-03-09" UTC → dia 8 em UTC-3)
  const str = typeof dataTransacao === "string" ? dataTransacao : dataTransacao.toISOString();
  const [anoTransacao, mesTransacao, diaTransacao] = str.slice(0, 10).split("-").map(Number);

  if (diaTransacao >= diaFechamento) {
    // No dia de fechamento ou após → próxima fatura
    const proximaFatura = new Date(Date.UTC(anoTransacao, mesTransacao, 1));
    return {
      mes: proximaFatura.getUTCMonth() + 1,
      ano: proximaFatura.getUTCFullYear(),
    };
  }

  return {
    mes: mesTransacao,
    ano: anoTransacao,
  };
}

/**
 * Calcula o período (início e fim) de uma fatura.
 *
 * REGRA DO PERÍODO:
 * - Início: dia de fechamento do mês anterior (inclusive)
 * - Fim: dia anterior ao fechamento do mês atual
 *
 * ✅ CORRIGIDO: usa clamp para dias inválidos (ex: diaFechamento=31 em fevereiro).
 * O JavaScript trata new Date(2026, 1, 31) como 03/mar — isso causava períodos errados.
 * Agora o fim é travado no último dia do mês quando necessário.
 *
 * @example
 * // Fatura Jan/2026, fecha dia 10
 * calcularPeriodoFatura(1, 2026, 10) → { inicio: 10/dez/2025 (UTC), fim: 10/jan/2026 00:00 UTC (exclusive) }
 */
export function calcularPeriodoFatura(
  mes: number,
  ano: number,
  diaFechamento: number
): { inicio: Date; fim: Date } {
  // Todas as datas em UTC para consistência com o banco (timestamp with timezone)

  // ── Início: dia de fechamento do mês anterior (inclusive) ─────────────────
  const anoMesAnterior = mes === 1 ? ano - 1 : ano;
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const ultimoDiaDoMesInicio = new Date(Date.UTC(anoMesAnterior, mesAnterior, 0)).getUTCDate();
  const diaInicio = Math.min(diaFechamento, ultimoDiaDoMesInicio);
  const inicio = new Date(Date.UTC(anoMesAnterior, mesAnterior - 1, diaInicio, 0, 0, 0));

  // ── Fim: dia ANTES do fechamento (exclusive) ───────────────────────────────
  // O dia de fechamento pertence à próxima fatura, então o fim é meia-noite
  // UTC do dia de fechamento (exclusivo via lt na query)
  const ultimoDiaDoMesFim = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const diaFim = Math.min(diaFechamento, ultimoDiaDoMesFim);
  const fim = new Date(Date.UTC(ano, mes - 1, diaFim, 0, 0, 0));

  return { inicio, fim };
}

/**
 * Formata período da fatura para exibição.
 *
 * @example
 * formatarPeriodoFatura(1, 2026, 10) → "10/12/2025 - 09/01/2026"
 */
export function formatarPeriodoFatura(
  mes: number,
  ano: number,
  diaFechamento: number
): string {
  const { inicio, fim } = calcularPeriodoFatura(mes, ano, diaFechamento);

  const fmt = (data: Date) =>
    data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return `${fmt(inicio)} - ${fmt(fim)}`;
}

// ========================================
// CÁLCULO DE VENCIMENTO E STATUS
// ========================================

/**
 * Calcula a data de vencimento de uma fatura.
 *
 * ✅ CORRIGIDO: trava no último dia do mês quando diaVencimento > dias do mês.
 *
 * @example
 * calcularDataVencimento(1, 2026, 15) → 15/jan/2026
 * calcularDataVencimento(2, 2026, 31) → 28/fev/2026 (não 03/mar)
 */
export function calcularDataVencimento(
  mes: number,
  ano: number,
  diaVencimento: number
): Date {
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const dia = Math.min(diaVencimento, ultimoDia);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/**
 * Calcula quantos dias faltam até o vencimento.
 *
 * @example
 * // Hoje: 10/jan/2026, vencimento: 15/jan/2026 → 5
 * // Hoje: 20/jan/2026, vencimento: 15/jan/2026 → -5
 */
export function calcularDiasAteVencimento(
  ano: number,
  mes: number,
  diaVencimento: number
): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataVencimento = calcularDataVencimento(mes, ano, diaVencimento);
  dataVencimento.setHours(0, 0, 0, 0);

  const diffTime = dataVencimento.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calcula o status da fatura baseado na data de vencimento.
 *
 * @example
 * calcularStatusFatura({ paga: false, ano: 2026, mes: 1 }, 15)
 * // Hoje < 15/jan → "EM_ABERTO"
 * // Hoje >= 15/jan → "ATRASADA"
 */
export function calcularStatusFatura(
  fatura: Pick<Fatura, "paga" | "ano" | "mes">,
  diaVencimento: number
): StatusFatura {
  if (fatura.paga) return "PAGA";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataVencimento = calcularDataVencimento(fatura.mes, fatura.ano, diaVencimento);
  dataVencimento.setHours(0, 0, 0, 0);

  return dataVencimento < hoje ? "ATRASADA" : "EM_ABERTO";
}

// ========================================
// VALIDAÇÕES
// ========================================

/**
 * Verifica se uma fatura está fechada (chegou ou passou da data de fechamento).
 * No dia de fechamento a fatura já está fechada.
 *
 * @example
 * // Hoje: 10/jan/2026, fecha dia 10
 * faturaEstaFechada(1, 2026, 10) → true
 * // Hoje: 09/jan/2026, fecha dia 10
 * faturaEstaFechada(1, 2026, 10) → false
 */
export function faturaEstaFechada(
  mes: number,
  ano: number,
  diaFechamento: number
): boolean {
  const hoje = new Date();
  const anoHoje  = hoje.getFullYear();
  const mesHoje  = hoje.getMonth() + 1;
  const diaHoje  = hoje.getDate();

  // Fatura só está fechada se o dia de fechamento já ocorreu NO PASSADO
  // Ex: hoje = 09/03, fechamento = 09 → fatura mar/2026 está fechada
  //     hoje = 09/03, fechamento = 09 → fatura abr/2026 NÃO está fechada
  if (ano > anoHoje) return false;
  if (ano === anoHoje && mes > mesHoje) return false;
  if (ano === anoHoje && mes === mesHoje) return diaHoje >= diaFechamento;
  return true; // mês/ano já passou inteiramente
}

/**
 * Verifica se é possível adicionar transação em uma fatura.
 */
export function validarAdicaoTransacao(
  fatura: Pick<Fatura, "paga" | "ano" | "mes">,
  diaFechamento: number
): { podeAdicionar: boolean; motivo?: string } {
  if (fatura.paga) {
    return { podeAdicionar: false, motivo: "Fatura já está paga" };
  }

  if (faturaEstaFechada(fatura.mes, fatura.ano, diaFechamento)) {
    return { podeAdicionar: false, motivo: "Fatura já está fechada" };
  }

  return { podeAdicionar: true };
}

// ========================================
// RESOLUÇÃO DE FATURA DISPONÍVEL
// ========================================

/**
 * Retorna a primeira fatura não fechada a partir de um mês/ano de referência.
 * Avança mês a mês até encontrar uma fatura que ainda pode receber transações.
 * Proteção contra loop infinito: máximo de 24 meses à frente.
 *
 * @example
 * // Fatura jan/2026 e fev/2026 fechadas, mar/2026 aberta
 * proximaFaturaAberta(1, 2026, 10) → { mes: 3, ano: 2026 }
 */
export function proximaFaturaAberta(
  mes: number,
  ano: number,
  diaFechamento: number
): { mes: number; ano: number } {
  let m = mes;
  let a = ano;

  for (let i = 0; i < 24; i++) {
    if (!faturaEstaFechada(m, a, diaFechamento)) {
      return { mes: m, ano: a };
    }
    // Avança um mês
    if (m === 12) { m = 1; a += 1; }
    else { m += 1; }
  }

  // Fallback improvável: retorna 24 meses à frente
  return { mes: m, ano: a };
}

// ========================================
// FORMATAÇÃO
// ========================================

/**
 * @example formatarNomeFatura(1, 2026) → "Janeiro/2026"
 */
export function formatarNomeFatura(mes: number, ano: number): string {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${meses[mes - 1]}/${ano}`;
}

/**
 * @example formatarNomeFaturaAbreviado(1, 2026) → "Jan/26"
 */
export function formatarNomeFaturaAbreviado(mes: number, ano: number): string {
  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${meses[mes - 1]}/${ano.toString().slice(-2)}`;
}