// src/types/preferences.ts

/**
 * Interface de Preferências do Usuário (completa)
 */
export interface Preferencias {
  id?: string;
  userId?: string;
  tema?: "light" | "dark" | "system";
  idioma?: string;
  moeda?: string;
  notificacoes?: boolean;
  notificacoesEmail?: boolean;
  formatoData?: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  inicioSemana?: "domingo" | "segunda";
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * DTO para atualizar preferências
 */
export interface AtualizarPreferenciasDTO {
  tema?: "light" | "dark" | "system";
  idioma?: string;
  moeda?: string;
  notificacoes?: boolean;
  notificacoesEmail?: boolean;
  formatoData?: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  inicioSemana?: "domingo" | "segunda";
}

/**
 * Tipos de tema disponíveis
 */
export type TemaType = "light" | "dark" | "system";

/**
 * Tipos de formato de data disponíveis
 */
export type FormatoDataType = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

/**
 * Tipos de início de semana
 */
export type InicioSemanaType = "domingo" | "segunda";

/**
 * Response padrão de mensagem
 */
export interface MessageResponse {
  message: string;
}