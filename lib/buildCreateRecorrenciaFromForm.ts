// src/lib/buildCreateRecorrenciaFromForm.ts

import type { CreateRecorrenciaDTO } from "@/types/recorrencia";
import { FormMovimentacao } from "./buildTransacoesFromForm";
import { normalizeDate } from "./utils";

interface Params {
  form: FormMovimentacao;
  contaId: string; // Pode ser vazio para cartão
  // undefined = indefinida (repete até o usuário cancelar)
  repeticoesTotal: number | undefined;
  estabelecimentoId?: string;
}

export function buildCreateRecorrenciaFromForm({
  form,
  contaId,
  repeticoesTotal,
  estabelecimentoId,
}: Params): CreateRecorrenciaDTO {
  const isCartao = form.formaPagamento === "cartao";

  if (!isCartao && !contaId) {
    throw new Error("contaId é obrigatório para recorrências com dinheiro ou PIX");
  }
  if (isCartao && !form.cartaoId) {
    throw new Error("cartaoId é obrigatório para recorrências com cartão");
  }

  const baseData = normalizeDate(form.data);

  return {
    tipo: form.tipo,
    valor: Number(form.valor),
    data: new Date(baseData).toISOString().split("T")[0],
    descricao: form.descricao || undefined,
    categoria: form.categoria || undefined,
    formaPagamento: form.formaPagamento,
    contaId: !isCartao ? contaId : undefined,
    cartaoId: isCartao && form.cartaoId ? Number(form.cartaoId) : undefined,
    estabelecimentoId: estabelecimentoId || undefined,
    repeticoesTotal,
  };
}