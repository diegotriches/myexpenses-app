export type TipoConta = "BANCARIA" | "CARTAO";

export interface ContaBase {
  id: string;
  nome: string;
  tipo: TipoConta;
  ativo: boolean;
  banco?: string;
  observacoes?: string;

  saldoInicial: number;
  saldoAtual: number;

  createdAt: string;
  updatedAt: string;
}

export interface ContaBancaria extends ContaBase {
  tipo: "BANCARIA";
}

export interface ContaCartao extends ContaBase {
  tipo: "CARTAO";

  bandeira?: string;
  ultimosDigitos?: string;
  limite?: number;

  fechamentoFatura?: number;
  vencimentoFatura?: number;
}

export type Conta = ContaBancaria | ContaCartao;

export interface CreateContaDTO {
  nome: string;
  tipo: TipoConta;
  ativo?: boolean;

  banco?: string;
  observacoes?: string;

  saldoInicial: number;

  bandeira?: string;
  ultimosDigitos?: string;
  limite?: number;
  fechamentoFatura?: number;
  vencimentoFatura?: number;
}

export type UpdateContaDTO = Partial<
  Omit<
    Conta,
    "id" | "createdAt" | "updatedAt" | "tipo"
  >
>;