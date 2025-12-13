export type TipoCartao = "credito" | "debito" | "multiplo";

export interface Cartao {
  id: number;

  nome: string;
  bandeira: string;
  tipo: TipoCartao;
  empresa?: string;

  limite: number;
  limiteDisponivel: number;

  diaFechamento?: number;
  diaVencimento?: number;

  cor: string;

  ativo: boolean;
  observacoes?: string;

  ultimosDigitos?: string;
}