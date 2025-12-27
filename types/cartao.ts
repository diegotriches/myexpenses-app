export type TipoCartao = "credito" | "debito";

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
  ativo: boolean;
  observacoes?: string;
  contaVinculadaId?: string | null;
}