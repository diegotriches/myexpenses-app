// src/types/preferences.ts

export type BackupFrequencia = "diario" | "semanal" | "mensal" | "desativado";

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
  backupFrequencia?: BackupFrequencia;
  backupQuantidadeMaxima?: number; // 1-12, quantidade de backups automáticos mantidos
  backupDiaSemana?: number;  // 0=domingo … 6=sábado (usado quando semanal)
  backupDiaMes?: number;     // 1-31 (usado quando mensal)
  ultimoBackupEm?: string | Date | null;
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
  backupFrequencia?: BackupFrequencia;
  backupQuantidadeMaxima?: number;
  backupDiaSemana?: number;
  backupDiaMes?: number;
}

export type TemaType = "light" | "dark" | "system";
export type FormatoDataType = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type InicioSemanaType = "domingo" | "segunda";

export interface MessageResponse {
  message: string;
}