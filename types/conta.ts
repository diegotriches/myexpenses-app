/**
 * Interface principal de Conta
 */
export interface Conta {
  id: string;
  userId: string;
  nome: string;
  ativo: boolean;
  banco?: string;
  observacoes?: string;
  saldoInicial: number;
  saldoAtual: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * DTO para criar conta (sem id, userId, timestamps)
 */
export interface CreateContaDTO {
  nome: string;
  ativo?: boolean;
  banco?: string;
  observacoes?: string;
  saldoInicial: number;
}

/**
 * DTO para atualizar conta (todos campos opcionais, exceto id)
 */
export interface UpdateContaDTO {
  nome?: string;
  ativo?: boolean;
  banco?: string;
  observacoes?: string;
  saldoInicial?: number;
  // ⚠️ saldoAtual NÃO pode ser editado diretamente (só via ajustarSaldo)
}

/**
 * Movimentação do extrato
 */
export interface MovimentacaoExtrato {
  id: string;
  contaId: string;
  data: string | Date;
  tipo: "entrada" | "saida";
  valor: number;
  descricao: string;
  saldoApos: number;
  origem: "TRANSACAO_MANUAL" | "PAGAMENTO_FATURA" | "TRANSFERENCIA" | "AJUSTE" | "ESTORNO" | "APLICACAO" | "RESGATE_APLICACAO";
  referenciaId?: string | null;
  createdAt: string | Date;
}

/**
 * ✅ ATUALIZADO: Resposta do endpoint /api/contas/[id]/extrato
 * Alinhado com a estrutura REAL retornada pela API
 */
export interface ExtratoResponse {
  contaId: string;
  contaNome: string;
  limit: number;
  offset: number;
  total: number;
  pageSize: number;
  resumo: {
    contaId: string;
    contaNome: string;
    saldoInicial: number;
    saldoFinal: number;
    totalEntradas: number;
    totalSaidas: number;
    variacao: number;
    periodo: {
      inicio: string;
      fim: string;
    };
  } | null;
  extrato: MovimentacaoExtrato[]; // ✅ API retorna "extrato", não "movimentacoes"
}

/**
 * ✅ NOVO: Tipo auxiliar para uso no frontend (compatibilidade)
 * Permite usar tanto "extrato" quanto "movimentacoes"
 */
export interface ExtratoContaData {
  conta: Conta;
  movimentacoes: MovimentacaoExtrato[];
  resumo: {
    saldoInicial: number;
    totalEntradas: number;
    totalSaidas: number;
    saldoFinal: number;
  };
}

/**
 * Filtros para buscar extrato
 */
export interface FiltrosExtrato {
  inicio?: string; // Data ISO (YYYY-MM-DD)
  fim?: string;    // Data ISO (YYYY-MM-DD)
  origem?: "TRANSACAO_MANUAL" | "PAGAMENTO_FATURA" | "TRANSFERENCIA" | "AJUSTE" | "ESTORNO";
  tipo?: "entrada" | "saida";
  limit?: number;
  offset?: number;
}