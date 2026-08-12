// src/types/recorrencia.ts

export interface Recorrencia {
  id: string;
  userId: string;
  descricao: string | null;
  categoria: string | null;
  valor: string; // numeric do Postgres vem como string
  tipo: "entrada" | "saida";
  formaPagamento: "dinheiro" | "pix" | "cartao";
  contaId: string | null;
  cartaoId: number | null;
  estabelecimentoId: string | null;
  diaDoMes: number;
  dataInicio: string;
  repeticoesTotal: number | null; // null = indefinida
  repeticoesGeradas: number;
  ativa: boolean;
  ultimaGeracaoMes: number | null;
  ultimaGeracaoAno: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecorrenciaDTO {
  tipo: "entrada" | "saida";
  valor: number;
  data: string; // YYYY-MM-DD — define diaDoMes e dataInicio
  descricao?: string;
  categoria?: string;
  formaPagamento: "dinheiro" | "pix" | "cartao";
  contaId?: string;
  cartaoId?: number;
  estabelecimentoId?: string;
  repeticoesTotal?: number; // omitido/undefined = indefinida
}

// ✅ EXPANDIDO: agora também permite editar valor, dia do mês, forma de
// pagamento e conta/cartão — vale só para as próximas gerações do cron,
// nunca recalcula ocorrências já criadas no histórico
export interface UpdateRecorrenciaDTO {
  ativa?: boolean;
  descricao?: string;
  categoria?: string;
  valor?: number;
  diaDoMes?: number;
  formaPagamento?: "dinheiro" | "pix" | "cartao";
  contaId?: string | null;
  cartaoId?: number | null;
}