export type TipoCartao = "credito" | "debito" | "multiplo";

export interface Cartao {
  id: number;

  nome: string;
  bandeira: string;
  tipo: TipoCartao;

  limite: number;
  limiteDisponivel: number;

  diaFechamento: number;
  diaVencimento: number;

  cor: string;
  icone: string;

  ativo: boolean;
  observacoes?: string;
}
