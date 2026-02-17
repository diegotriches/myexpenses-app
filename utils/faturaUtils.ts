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
 * - Transação ANTES ou NO dia de fechamento → Fatura do mês ATUAL
 * - Transação APÓS o dia de fechamento → Fatura do PRÓXIMO mês
 *
 * @example
 * // Cartão fecha dia 10
 * calcularFaturaDaTransacao(new Date('2026-01-05'), 10) → { mes: 1, ano: 2026 }
 * calcularFaturaDaTransacao(new Date('2026-01-12'), 10) → { mes: 2, ano: 2026 }
 */
export function calcularFaturaDaTransacao(
  dataTransacao: Date,
  diaFechamento: number
): { mes: number; ano: number } {
  const data = new Date(dataTransacao);
  const diaTransacao = data.getDate();
  const mesTransacao = data.getMonth() + 1; // 1-12
  const anoTransacao = data.getFullYear();

  if (diaTransacao > diaFechamento) {
    // Próximo mês — usa new Date(ano, mes, 1) que é seguro para qualquer mês
    const proximaFatura = new Date(anoTransacao, mesTransacao, 1);
    return {
      mes: proximaFatura.getMonth() + 1,
      ano: proximaFatura.getFullYear(),
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
 * - Início: dia seguinte ao fechamento do mês anterior
 * - Fim: dia de fechamento do mês atual
 *
 * ✅ CORRIGIDO: usa clamp para dias inválidos (ex: diaFechamento=31 em fevereiro).
 * O JavaScript trata new Date(2026, 1, 31) como 03/mar — isso causava períodos errados.
 * Agora o fim é travado no último dia do mês quando necessário.
 *
 * @example
 * // Fatura Jan/2026, fecha dia 10
 * calcularPeriodoFatura(1, 2026, 10) → { inicio: 11/dez/2025, fim: 10/jan/2026 }
 *
 * // Fatura Fev/2026, fecha dia 31 (fevereiro tem 28 dias)
 * calcularPeriodoFatura(2, 2026, 31) → { inicio: 01/fev/2026, fim: 28/fev/2026 }
 */
export function calcularPeriodoFatura(
  mes: number,
  ano: number,
  diaFechamento: number
): { inicio: Date; fim: Date } {
  // ── Fim: diaFechamento do mês atual, travado no último dia do mês ──────────
  const ultimoDiaDoMesFim = new Date(ano, mes, 0).getDate(); // dia 0 do próximo mês = último dia do mês atual
  const diaFim = Math.min(diaFechamento, ultimoDiaDoMesFim);
  const fim = new Date(ano, mes - 1, diaFim, 23, 59, 59);

  // ── Início: dia seguinte ao fechamento do mês anterior ────────────────────
  // Calcula o último dia do mês anterior para travar o diaFechamento
  const anoMesAnterior = mes === 1 ? ano - 1 : ano;
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const ultimoDiaDoMesInicio = new Date(anoMesAnterior, mesAnterior, 0).getDate();
  const diaFechamentoAnterior = Math.min(diaFechamento, ultimoDiaDoMesInicio);

  // Início = dia seguinte ao fechamento do mês anterior
  // Usar new Date(ano, mes, dia) com dia=diaFechamentoAnterior+1 é seguro:
  // se diaFechamentoAnterior = último dia do mês, +1 avança corretamente para o dia 1 do mês seguinte
  const inicio = new Date(anoMesAnterior, mesAnterior - 1, diaFechamentoAnterior + 1, 0, 0, 0);

  return { inicio, fim };
}

/**
 * Formata período da fatura para exibição.
 *
 * @example
 * formatarPeriodoFatura(1, 2026, 10) → "11/12/2025 - 10/01/2026"
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
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dia = Math.min(diaVencimento, ultimoDia);
  return new Date(ano, mes - 1, dia);
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
 * Verifica se uma fatura está fechada (passou da data de fechamento).
 *
 * @example
 * // Hoje: 15/jan/2026, fecha dia 10
 * faturaEstaFechada(1, 2026, 10) → true
 */
export function faturaEstaFechada(
  mes: number,
  ano: number,
  diaFechamento: number
): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dia = Math.min(diaFechamento, ultimoDia);
  const dataFechamento = new Date(ano, mes - 1, dia, 23, 59, 59);

  return hoje > dataFechamento;
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