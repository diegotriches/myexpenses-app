export interface CreateTransferenciaDTO {
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number;
  data: string;
  descricao?: string;
}