// src/types/notificacao.ts

export type TipoNotificacao = 
  | "FATURA_PROXIMA_VENCIMENTO"    // 3 dias antes
  | "FATURA_VENCIDA"                // Após vencimento
  | "FATURA_PAGA"                   // Confirmação
  | "LIMITE_CARTAO_80"              // 80% do limite
  | "LIMITE_CARTAO_95"              // 95% do limite
  | "SALDO_BAIXO"                   // < R$ 100
  | "SALDO_NEGATIVO"                // Saldo negativo
  | "TRANSACAO_ENTRADA_ALTA"        // > R$ 1000
  | "TRANSACAO_SAIDA_ALTA";         // > R$ 500

export type SeveridadeNotificacao = "info" | "warning" | "error" | "success";

export interface Notificacao {
  id: string;
  userId: string;
  tipo: TipoNotificacao;
  severidade: SeveridadeNotificacao;
  titulo: string;
  mensagem: string;
  lida: boolean;
  link?: string;                    // Link para ação (ex: /cartoes)
  metadata?: Record<string, any>;   // Dados extras (cartaoId, contaId, etc)
  createdAt: string | Date;
}

export interface CriarNotificacaoDTO {
  tipo: TipoNotificacao;
  severidade: SeveridadeNotificacao;
  titulo: string;
  mensagem: string;
  link?: string;
  metadata?: Record<string, any>;
}

// Configurações de notificações do usuário
export interface PreferenciasNotificacao {
  faturas: boolean;              // Notificar sobre faturas
  limiteCartao: boolean;         // Notificar sobre limite
  saldoBaixo: boolean;           // Notificar sobre saldo baixo
  transacoesAltas: boolean;      // Notificar sobre transações altas
  emailNotificacoes: boolean;    // Enviar por email (futuro)
  diasAntesVencimento: number;   // Quantos dias antes notificar (padrão: 3)
  limiteMinimoConta: number;     // Valor mínimo para alertar (padrão: 100)
}

// Resposta da API com contadores
export interface NotificacoesResponse {
  notificacoes: Notificacao[];
  total: number;
  naoLidas: number;
}