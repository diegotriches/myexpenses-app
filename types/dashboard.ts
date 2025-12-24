export type CondicaoPagamento = 'dinheiro' | 'pix' | 'cartao';
export type FormaPagamento = 'aVista' | 'parcelado' | 'recorrente';

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

export type DashboardCategorias = {
  categoria: string;
  total: number;
}[];

export interface DashboardResumo {
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface DashboardCartao {
  cartaoId: number;
  nome: string;
  totalFatura: number;
  paga: boolean;
}

export interface DashboardResponse {
  periodo: {
    mes: number;
    ano: number;
  };
  resumo: DashboardResumo;
  cartoes: DashboardCartao[];
}
