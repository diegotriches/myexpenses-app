export interface Conta {
  id: string;
  nome: string;
  ativo: boolean;
  banco?: string;
  observacoes?: string;

  saldoInicial: number;
  saldoAtual: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateContaDTO {
  nome: string;
  ativo?: boolean;
  banco?: string;
  observacoes?: string;
  saldoInicial: number;
}

export type UpdateContaDTO = Partial<Omit<Conta, "id" | "createdAt" | "updatedAt">>;