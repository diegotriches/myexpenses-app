// src/utils/faturaUtils.ts

import type { Fatura, StatusFatura } from "@/types/fatura";

// ========================================
// CÁLCULO DE FATURA E PERÍODO
// ========================================

/**
 * Calcula qual fatura (mês/ano) uma transação pertence
 * baseado na data da transação e no dia de fechamento do cartão
 * 
 * **REGRA DO CICLO:**
 * - Transação ANTES ou NO dia de fechamento → Fatura do mês ATUAL
 * - Transação APÓS o dia de fechamento → Fatura do PRÓXIMO mês
 * 
 * @param dataTransacao - Data da transação
 * @param diaFechamento - Dia de fechamento do cartão (1-31)
 * @returns { mes: number, ano: number } - Mês (1-12) e ano da fatura
 * 
 * @example
 * // Cartão fecha dia 10
 * calcularFaturaDaTransacao(new Date('2026-01-05'), 10)
 * // Retorna: { mes: 1, ano: 2026 } (Janeiro - antes do fechamento)
 * 
 * calcularFaturaDaTransacao(new Date('2026-01-12'), 10)
 * // Retorna: { mes: 2, ano: 2026 } (Fevereiro - após o fechamento)
 */
export function calcularFaturaDaTransacao(
  dataTransacao: Date,
  diaFechamento: number
): { mes: number; ano: number } {
  const data = new Date(dataTransacao);
  const diaTransacao = data.getDate();
  const mesTransacao = data.getMonth() + 1; // 1-12
  const anoTransacao = data.getFullYear();

  // Se a transação é APÓS o dia de fechamento,
  // ela vai para a fatura do PRÓXIMO mês
  if (diaTransacao > diaFechamento) {
    // Criar data do próximo mês
    const proximaFatura = new Date(anoTransacao, mesTransacao, 1); // Primeiro dia do próximo mês
    
    return {
      mes: proximaFatura.getMonth() + 1, // 1-12
      ano: proximaFatura.getFullYear(),
    };
  }

  // Se a transação é ANTES ou NO dia de fechamento,
  // ela vai para a fatura do mês ATUAL
  return {
    mes: mesTransacao,
    ano: anoTransacao,
  };
}

/**
 * Calcula o período (início e fim) de uma fatura
 * 
 * **REGRA DO PERÍODO:**
 * - Início: (diaFechamento + 1) do mês ANTERIOR
 * - Fim: diaFechamento do mês ATUAL
 * 
 * @param mes - Mês da fatura (1-12)
 * @param ano - Ano da fatura
 * @param diaFechamento - Dia de fechamento do cartão (1-31)
 * @returns { inicio: Date, fim: Date }
 * 
 * @example
 * // Fatura de Janeiro/2026, cartão fecha dia 10
 * calcularPeriodoFatura(1, 2026, 10)
 * // Retorna: { inicio: 11/Dez/2025, fim: 10/Jan/2026 }
 */
export function calcularPeriodoFatura(
  mes: number,
  ano: number,
  diaFechamento: number
): { inicio: Date; fim: Date } {
  // Fatura de Janeiro (mes=1):
  // Início: 11 de Dezembro do ano anterior
  // Fim: 10 de Janeiro do ano atual
  
  // Data de fechamento (último dia do ciclo)
  const fim = new Date(ano, mes - 1, diaFechamento, 23, 59, 59);
  
  // Data de início (dia seguinte ao fechamento do mês anterior)
  const inicio = new Date(ano, mes - 2, diaFechamento + 1, 0, 0, 0);
  
  return { inicio, fim };
}

/**
 * Formata período da fatura para exibição
 * 
 * @param mes - Mês da fatura (1-12)
 * @param ano - Ano da fatura
 * @param diaFechamento - Dia de fechamento do cartão (1-31)
 * @returns string - Ex: "11/12/2025 - 10/01/2026"
 * 
 * @example
 * formatarPeriodoFatura(1, 2026, 10)
 * // Retorna: "11/12/2025 - 10/01/2026"
 */
export function formatarPeriodoFatura(
  mes: number,
  ano: number,
  diaFechamento: number
): string {
  const { inicio, fim } = calcularPeriodoFatura(mes, ano, diaFechamento);
  
  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  
  return `${formatarData(inicio)} - ${formatarData(fim)}`;
}

// ========================================
// CÁLCULO DE VENCIMENTO E STATUS
// ========================================

/**
 * Calcula a data de vencimento de uma fatura
 * 
 * @param mes - Mês da fatura (1-12)
 * @param ano - Ano da fatura
 * @param diaVencimento - Dia de vencimento do cartão (1-31)
 * @returns Date - Data de vencimento
 * 
 * @example
 * calcularDataVencimento(1, 2026, 15)
 * // Retorna: 15/Jan/2026
 */
export function calcularDataVencimento(
  mes: number,
  ano: number,
  diaVencimento: number
): Date {
  return new Date(ano, mes - 1, diaVencimento);
}

/**
 * Calcula quantos dias faltam até o vencimento
 * 
 * @param ano - Ano da fatura
 * @param mes - Mês da fatura (1-12)
 * @param diaVencimento - Dia de vencimento do cartão (1-31)
 * @returns number - Dias até vencimento (negativo se vencida)
 * 
 * @example
 * calcularDiasAteVencimento(2026, 1, 15)
 * // Se hoje é 10/01/2026, retorna: 5
 * // Se hoje é 20/01/2026, retorna: -5
 */
export function calcularDiasAteVencimento(
  ano: number,
  mes: number,
  diaVencimento: number
): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataVencimento = new Date(ano, mes - 1, diaVencimento);
  dataVencimento.setHours(0, 0, 0, 0);

  const diffTime = dataVencimento.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Calcula o status da fatura baseado na data de vencimento
 * 
 * @param fatura - Dados da fatura (paga, ano, mes)
 * @param diaVencimento - Dia de vencimento do cartão
 * @returns StatusFatura - "PAGA" | "EM_ABERTO" | "ATRASADA"
 * 
 * @example
 * calcularStatusFatura({ paga: false, ano: 2026, mes: 1 }, 15)
 * // Se hoje < 15/01/2026, retorna: "EM_ABERTO"
 * // Se hoje >= 15/01/2026, retorna: "ATRASADA"
 */
export function calcularStatusFatura(
  fatura: Pick<Fatura, "paga" | "ano" | "mes">,
  diaVencimento: number
): StatusFatura {
  if (fatura.paga) return "PAGA";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const dataVencimento = new Date(fatura.ano, fatura.mes - 1, diaVencimento);
  dataVencimento.setHours(0, 0, 0, 0);

  return dataVencimento < hoje ? "ATRASADA" : "EM_ABERTO";
}

// ========================================
// VALIDAÇÕES
// ========================================

/**
 * Verifica se uma fatura está fechada (passou da data de fechamento)
 * 
 * @param mes - Mês da fatura (1-12)
 * @param ano - Ano da fatura
 * @param diaFechamento - Dia de fechamento do cartão (1-31)
 * @returns boolean - true se a fatura está fechada
 * 
 * @example
 * // Se hoje é 15/01/2026 e cartão fecha dia 10
 * faturaEstaFechada(1, 2026, 10)
 * // Retorna: true (fatura de Janeiro já fechou)
 */
export function faturaEstaFechada(
  mes: number,
  ano: number,
  diaFechamento: number
): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const dataFechamento = new Date(ano, mes - 1, diaFechamento, 23, 59, 59);
  
  return hoje > dataFechamento;
}

/**
 * Verifica se é possível adicionar transação em uma fatura
 * 
 * @param fatura - Dados da fatura
 * @param diaFechamento - Dia de fechamento do cartão
 * @returns { podeAdicionar: boolean, motivo?: string }
 * 
 * @example
 * validarAdicaoTransacao({ paga: true, ano: 2026, mes: 1 }, 10)
 * // Retorna: { podeAdicionar: false, motivo: "Fatura já está paga" }
 */
export function validarAdicaoTransacao(
  fatura: Pick<Fatura, "paga" | "ano" | "mes">,
  diaFechamento: number
): { podeAdicionar: boolean; motivo?: string } {
  // Validação 1: Fatura já paga
  if (fatura.paga) {
    return {
      podeAdicionar: false,
      motivo: "Fatura já está paga",
    };
  }

  // Validação 2: Fatura já fechou
  const fechada = faturaEstaFechada(fatura.mes, fatura.ano, diaFechamento);
  if (fechada) {
    return {
      podeAdicionar: false,
      motivo: "Fatura já está fechada",
    };
  }

  return { podeAdicionar: true };
}

// ========================================
// FORMATAÇÃO
// ========================================

/**
 * Formata o nome do mês/ano da fatura
 * 
 * @param mes - Mês da fatura (1-12)
 * @param ano - Ano da fatura
 * @returns string - Ex: "Janeiro/2026"
 * 
 * @example
 * formatarNomeFatura(1, 2026)
 * // Retorna: "Janeiro/2026"
 */
export function formatarNomeFatura(mes: number, ano: number): string {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return `${meses[mes - 1]}/${ano}`;
}

/**
 * Formata o nome abreviado do mês/ano da fatura
 * 
 * @param mes - Mês da fatura (1-12)
 * @param ano - Ano da fatura
 * @returns string - Ex: "Jan/26"
 * 
 * @example
 * formatarNomeFaturaAbreviado(1, 2026)
 * // Retorna: "Jan/26"
 */
export function formatarNomeFaturaAbreviado(mes: number, ano: number): string {
  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  return `${meses[mes - 1]}/${ano.toString().slice(-2)}`;
}