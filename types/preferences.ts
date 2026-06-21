// src/types/preferences.ts

export interface Preferencias {
  id?: string;
  userId?: string;
  tema?: "light" | "dark" | "system";
  idioma?: string;
  moeda?: string;
  notificacoes?: boolean;
  formatoData?: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  inicioSemana?: "domingo" | "segunda";
  backupAutomatico?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface AtualizarPreferenciasDTO {
  tema?: "light" | "dark" | "system";
  idioma?: string;
  moeda?: string;
  notificacoes?: boolean;
  formatoData?: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  inicioSemana?: "domingo" | "segunda";
  backupAutomatico?: boolean;
}

export type TemaType = "light" | "dark" | "system";
export type FormatoDataType = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type InicioSemanaType = "domingo" | "segunda";

export interface MessageResponse {
  message: string;
}