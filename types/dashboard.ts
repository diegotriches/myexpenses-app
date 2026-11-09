// ========================================
// TIPOS: Dashboard
// ========================================

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
 * Despesas futuras (transações de cartão em faturas posteriores)
 * Retornado por GET /api/dashboard/despesas-futuras
 */
export interface DespesasFuturas {
  total: number;
  quantidade: number;
}

// ========================================
// ✅ TIPOS NOVOS: Endpoints adicionados na refatoração
// ========================================

/**
 * Retornado por GET /api/dashboard/valores-periodo
 * Usado pelo CardValores
 */
export interface ValoresPeriodoResponse {
  recebidos: number;
  aReceber: number;
  aPagar: number;
  projecao: number;
}

/**
 * Item individual de gasto
 * Usado em MaioresGastosResponse
 */
export interface GastoItem {
  id: number;
  descricao: string;
  valor: number;
  data: Date | string;
  categoria: string | null;
}

/**
 * Retornado por GET /api/dashboard/maiores-gastos
 * Usado pelo CardMaioresGastos
 */
export interface MaioresGastosResponse {
  gastos: GastoItem[];
  total: number;
  media: number;
}

/**
 * Item individual de transação recente
 * Usado em TransacoesRecentesResponse
 */
export interface TransacaoRecenteItem {
  id: number;
  descricao: string | null;
  valor: number;
  data: Date | string;
  tipo: "entrada" | "saida" | "estorno";
  categoria: string | null;
  parcelado: boolean;
  parcelas: number | null;
  parcelaAtual: number | null;
  recorrente: boolean;
}

/**
 * Retornado por GET /api/dashboard/transacoes-recentes
 * Usado pelo CardTransacoesRecentes
 */
export interface TransacoesRecentesResponse {
  transacoes: TransacaoRecenteItem[];
}

// ========================================
// TIPOS: Resposta da API (para TypeScript)
// ========================================

// ⚠️ GraficoMesesResponse mantido por compatibilidade, mas não é mais usado ativamente
// Pode ser removido futuramente se não houver outras referências
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
  recorrenciaId?: string;
  repeticoes?: number;
  data?: string | Date;
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

