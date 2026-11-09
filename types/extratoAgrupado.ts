/** Extrato de lançamentos agrupado por categoria ou estabelecimento (GET /api/{origem}/[id]/extrato). */
export type OrigemExtratoAgrupado = "categorias" | "estabelecimentos";

export interface LancamentoAgrupado {
  id: string;
  data: string;
  tipo: "entrada" | "saida" | "estorno";
  descricao: string | null;
  valor: number;
  formaPagamento: string | null;
  contaId: string | null;
  contaNome: string | null;
  cartaoId: number | null;
  cartaoNome: string | null;
  parcelado: boolean | null;
  parcelas: number | null;
  parcelaAtual: number | null;
  recorrente: boolean | null;
  /** Só no extrato de estabelecimento */
  categoria?: string | null;
}

export interface TotaisExtratoAgrupado {
  totalEntrada: number;
  totalSaida: number;
  quantidade: number;
}

export interface ExtratoAgrupadoResponse {
  /** Presente no extrato de categoria */
  categoria?: { id: string; nome: string; tipo: "entrada" | "saida" | "ambos"; icone: string };
  /** Presentes no extrato de estabelecimento */
  estabelecimento?: { id: string; nome: string; icone: string; localizacao: string | null };
  tipoPrincipal?: "entrada" | "saida";
  temEntradaESaida?: boolean;

  periodo: { ano: number; mes: number | null };
  resumo: TotaisExtratoAgrupado;
  anterior: TotaisExtratoAgrupado;
  porMes: { mes: number; entrada: number; saida: number }[];
  lancamentos: LancamentoAgrupado[];
  temMais: boolean;
}

export interface FiltrosExtratoAgrupado {
  ano: number;
  mes: number | null;
  tipo: "todos" | "entrada" | "saida";
  busca: string;
}
