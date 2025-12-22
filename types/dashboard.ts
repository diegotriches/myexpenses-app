export type CondicaoPagamento = 'dinheiro' | 'pix' | 'cartao';
export type FormaPagamento = 'aVista' | 'parcelado' | 'recorrente';

export type DashboardResumo = {
  receitas: number;
  despesas: number;
  balanco: number;
};

export type DashboardFaturas = {
  totalFaturas: number;
  totalPago: number;
  totalAberto: number;
};

export type DashboardValores = {
  recebidos: number;
  aPagar: number;
};

export type DashboardGraficoMeses = {
  mes: string;
  receitas: number;
  despesas: number;
  balanco: number;
}[];

export type DashboardTransacoes = {
  id: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  descricao: string;
  data: string;
  categoria: string;
  conta: string;
  formaPagamento: FormaPagamento;
  condicaoPagamento: CondicaoPagamento;
  parcelado?: boolean;
  recorrente?: boolean;
}[];

export type DashboardCategorias = {
  categoria: string;
  total: number;
}[];
