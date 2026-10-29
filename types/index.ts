// src/types/index.ts

/**
 * TYPES: EXPORTS CENTRALIZADOS
 * Arquivo central para exportar todos os tipos do projeto
 */

// ============================================================================
// TIPOS DO SCHEMA (Drizzle ORM)
// ============================================================================

export type {
  User,
  NewUser,
  Preference,
  NewPreference,
  CategoriaDb,
  NovaCategoriaDb,
} from "@/db/schema";

// ============================================================================
// TIPOS CUSTOMIZADOS - CATEGORIAS
// ============================================================================

export interface Categoria {
  id: string;
  userId: string;
  nome: string;
  tipo: "entrada" | "saida" | "ambos";
  icone: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================================================
// TIPOS CUSTOMIZADOS - CONTAS
// ============================================================================

export interface Conta {
  id: string;
  userId: string;
  nome: string;
  ativo: boolean;
  observacoes?: string | null;
  saldoInicial: string | number;
  saldoAtual: string | number;
  banco?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================================================
// TIPOS CUSTOMIZADOS - CARTÕES
// ============================================================================

export interface Cartao {
  id: number;
  userId: string;
  nome: string;
  tipo: string;
  bandeira: string;
  empresa: string;
  limite: string | number;
  limiteDisponivel: string | number;
  diaFechamento?: number | null;
  diaVencimento?: number | null;
  ativo: boolean;
  observacoes?: string | null;
  contaVinculadaId?: string | null;
  createdAt: Date | string;
}

// ============================================================================
// TIPOS CUSTOMIZADOS - TRANSAÇÕES
// ============================================================================

export interface Transacao {
  id: string;
  userId: string;
  data: Date | string;
  tipo: string;
  descricao?: string | null;
  valor: string | number;
  categoria?: string | null;
  formaPagamento?: string | null;
  contaId?: string | null;
  transferenciaId?: string | null;
  cartaoId?: number | null;
  recorrente?: boolean | null;
  recorrenciaId?: string | null;
  repeticoes?: number | null;
  parcelado?: boolean | null;
  parcelamentoId?: string | null;
  parcelas?: number | null;
  parcelaAtual?: number | null;
  createdAt: Date | string;
}

// ============================================================================
// TIPOS CUSTOMIZADOS - FATURAS
// ============================================================================

export interface Fatura {
  id: number;
  userId: string;
  cartaoId: number;
  mes: number;
  ano: number;
  mesReferencia: number;
  anoReferencia: number;
  total: string | number;
  paga: boolean;
  dataPagamento?: Date | string | null;
  contaPagamentoId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================================================
// TIPOS CUSTOMIZADOS - EXTRATO
// ============================================================================

export interface ExtratoConta {
  id: string;
  userId: string;
  contaId: string;
  data: Date | string;
  tipo: "entrada" | "saida";
  valor: string | number;
  descricao: string;
  saldoApos: string | number;
  origem: "TRANSACAO_MANUAL" | "PAGAMENTO_FATURA" | "TRANSFERENCIA" | "AJUSTE" | "ESTORNO" | "APLICACAO" | "RESGATE_APLICACAO";
  referenciaId?: string | null;
  createdAt: Date | string;
}

// ============================================================================
// TIPOS CUSTOMIZADOS - NOTIFICAÇÕES
// ============================================================================

export interface Notificacao {
  id: string;
  userId: string;
  tipo: string;
  severidade: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  link?: string | null;
  metadata?: any;
  createdAt: Date | string;
}

export interface PreferenciasNotificacao {
  id: string;
  userId: string;
  faturas: boolean;
  limiteCartao: boolean;
  saldoBaixo: boolean;
  transacoesAltas: boolean;
  diasAntesVencimento: number;
  limiteMinimoConta: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================================================
// RE-EXPORTS DE OUTROS MÓDULOS
// ============================================================================

export type * from "@/types/export";
export type * from "@/types/import";