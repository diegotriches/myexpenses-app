/**
 * Calcula qual fatura (mês/ano) uma transação pertence
 * baseado na data da transação e no dia de fechamento do cartão
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
 * Verifica se uma fatura está fechada (passou da data de fechamento)
 * 
 * @param mes - Mês da fatura (1-12)
 * @param ano - Ano da fatura
 * @param diaFechamento - Dia de fechamento do cartão (1-31)
 * @returns boolean - true se a fatura está fechada
 */
export function faturaEstaFechada(
  mes: number,
  ano: number,
  diaFechamento: number
): boolean {
  const hoje = new Date();
  const dataFechamento = new Date(ano, mes - 1, diaFechamento, 23, 59, 59);
  
  return hoje > dataFechamento;
}

/**
 * Formata período da fatura para exibição
 * 
 * @param mes - Mês da fatura (1-12)
 * @param ano - Ano da fatura
 * @param diaFechamento - Dia de fechamento do cartão (1-31)
 * @returns string - Ex: "11/12/2025 - 10/01/2026"
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