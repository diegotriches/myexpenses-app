// src/types/dashboard.ts

// ========================================
// TIPOS: Dashboard
// ========================================

export type CondicaoPagamento = 'dinheiro' | 'pix' | 'cartao';
export type FormaPagamento = 'aVista' | 'parcelado' | 'recorrente';

/**
 * Resumo financeiro do período
 */
export interface DashboardResumo {
  receitas: number;
  despesas: number;
  saldo: number;
  quantidadeReceitas?: number;
  quantidadeDespesas?: number;
}

/**
 * Informações de cartão no dashboard
 */
export interface DashboardCartao {
  cartaoId: number;
  nome: string;
  totalFatura: number;
  paga: boolean;
  dataVencimento?: string;
  status?: "PAGA" | "EM_ABERTO" | "ATRASADA";
}

/**
 * Resposta completa da API /api/dashboard
 */
export interface DashboardResponse {
  periodo: {
    mes: number;
    ano: number;
  };
  resumo: DashboardResumo;
  cartoes: DashboardCartao[];
}

/**
 * Dados para gráfico de meses
 */
export interface DadosGraficoMeses {
  mes: string; // "YYYY-MM" ou "Jan/2026"
  receitas: number;
  despesas: number;
  balanco: number;
}

/**
 * Totais de faturas
 */
export interface DashboardFaturas {
  totalFaturas: number;
  totalPago: number;
  totalAberto: number;
}

/**
 * Valores recebidos e a pagar
 */
export interface DashboardValores {
  recebidos: number;
  aPagar: number;
}

/**
 * Total por categoria
 */
export interface CategoriaTotal {
  categoria: string;
  total: number;
  quantidade: number;
}

/**
 * Contagem por forma de pagamento
 */
export interface CondicoesPagamento {
  dinheiro: number;
  pix: number;
  cartao: number;
}

/**
 * Contagem por tipo de pagamento
 */
export interface FormasPagamento {
  aVista: number;
  parcelado: number;
  recorrente: number;
}

/**
 * Filtros para extrato
 */
export interface FiltrosExtrato {
  ano: number;
  mes: number;
  contaId?: string;
  origem?: string;
  tipo?: "entrada" | "saida";
  dataInicio?: string;
  dataFim?: string;
}

/**
 * Item do extrato
 */
export interface ItemExtrato {
  id: string;
  contaId: string;
  data: string;
  tipo: "entrada" | "saida";
  valor: number | string;
  descricao: string;
  saldoApos: number | string;
  origem: string;
  referenciaId?: string;
}

/**
 * Resposta do extrato
 */
export interface ExtratoResponse {
  movimentacoes: ItemExtrato[];
  resumo: {
    saldoInicial: number;
    totalEntradas: number;
    totalSaidas: number;
    saldoFinal: number;
  };
}

/**
 * ✨ NOVO: Despesas futuras (transações de cartão em faturas posteriores)
 * 
 * Retornado por GET /api/dashboard/despesas-futuras
 * 
 * @example
 * {
 *   total: 2450.00,      // Soma dos valores das despesas futuras
 *   quantidade: 8        // Número de transações pendentes
 * }
 */
export interface DespesasFuturas {
  total: number;      // Soma dos valores de todas as despesas futuras
  quantidade: number; // Quantidade de transações pendentes
}

// ========================================
// TIPOS: Resposta da API (para TypeScript)
// ========================================

/**
 * Tipo de resposta do gráfico de meses
 */
export type GraficoMesesResponse = DadosGraficoMeses[];

/**
 * Tipo de resposta do resumo de faturas
 */
export type FaturasResumo = DashboardFaturas;

/**
 * Tipo de resposta de transações recorrentes
 */
export interface Recorrente {
  id: string;
  descricao: string;
  valor: number;
  categoria?: string;
  tipo: "entrada" | "saida";
  recorrente: boolean;
}

// ========================================
// HELPERS
// ========================================

/**
 * Formata valor para moeda brasileira
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

/**
 * Formata mês do gráfico (YYYY-MM → MMM/YYYY)
 */
export function formatarMesGrafico(mes: string): string {
  try {
    const [ano, mesNum] = mes.split('-');
    const data = new Date(Number(ano), Number(mesNum) - 1);
    return data.toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    }).replace('.', '');
  } catch {
    return mes;
  }
}

/**
 * Calcula percentual de uma parte em relação ao total
 */
export function calcularPercentual(parte: number, total: number): number {
  if (total === 0) return 0;
  return (parte / total) * 100;
}

/**
 * Valida filtros de extrato
 */
export function validarFiltrosExtrato(
  filtros: Partial<FiltrosExtrato>
): { valido: boolean; erro?: string } {
  if (!filtros.ano || !filtros.mes) {
    return { valido: false, erro: "Ano e mês são obrigatórios" };
  }

  if (filtros.mes < 1 || filtros.mes > 12) {
    return { valido: false, erro: "Mês deve estar entre 1 e 12" };
  }

  if (filtros.ano < 2000 || filtros.ano > 2100) {
    return { valido: false, erro: "Ano inválido" };
  }

  return { valido: true };
}