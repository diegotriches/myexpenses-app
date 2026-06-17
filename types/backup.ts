// src/types/backup.ts

export interface BackupListItem {
  id:           string;
  createdAt:    string;
  tamanhoBytes: number;
  estatisticas: Record<string, number> | null;
}

export interface RestaurarBackupResponse {
  message:  string;
  backupId: string;
  data:     string;
}