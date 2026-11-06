// src/types/notificacao.ts

export type TipoNotificacao = 
  | "FATURA_PROXIMA_VENCIMENTO"
  | "FATURA_VENCIDA"
  | "FATURA_PAGA"
  | "LIMITE_CARTAO_80"
  | "LIMITE_CARTAO_95"
  | "SALDO_BAIXO"
  | "SALDO_NEGATIVO"
  | "TRANSACAO_ENTRADA_ALTA"
  | "TRANSACAO_SAIDA_ALTA"
  | "BACKUP_INATIVO"
  | "RECORRENCIA_SALDO_NEGATIVO"
  | "RECORRENCIA_LIMITE_EXCEDIDO"
  | "RECORRENCIA_ERRO";

export type SeveridadeNotificacao = "info" | "warning" | "error" | "success";

export interface Notificacao {
  id: string;
  userId: string;
  tipo: TipoNotificacao;
  severidade: SeveridadeNotificacao;
  titulo: string;
  mensagem: string;
  lida: boolean;
  link?: string;
  metadata?: Record<string, any>;
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

export interface PreferenciasNotificacao {
  faturas: boolean;
  limiteCartao: boolean;
  saldoBaixo: boolean;
  transacoesAltas: boolean;
  diasAntesVencimento: number;
  limiteMinimoConta: number;
}

export interface NotificacoesResponse {
  notificacoes: Notificacao[];
  total: number;
  naoLidas: number;
}