export interface BackupListItem {
  id:           string;
  createdAt:    string;
  tamanhoBytes: number;
  estatisticas: Record<string, number> | null;
}

export interface ResultadoImportacao {
  resultados:     { modulo: string; importados: number }[];
  totalImportado: number;
}

export interface RestaurarBackupResponse {
  message:  string;
  backupId: string;
  data:     string;
}