// src/utils/dashboardUtils.ts

import { Transacao } from "@/types/transacao";
import type {
  CondicoesPagamento,
  FormasPagamento,
  CategoriaTotal,
} from "@/types/dashboard";

// ========================================
// FUNÇÕES DE CÁLCULO
// ========================================

/**
 * Conta transações por forma de pagamento
 * 
 * @param transacoes - Array de transações
 * @returns Contagem de dinheiro, pix e cartão
 */
export function contarCondicoes(transacoes: Transacao[]): CondicoesPagamento {
  const resultado: CondicoesPagamento = { dinheiro: 0, pix: 0, cartao: 0 };

  transacoes.forEach(t => {
    const forma = t.formaPagamento || 'dinheiro';
    if (forma === 'dinheiro' || forma === 'pix' || forma === 'cartao') {
      resultado[forma]++;
    }
  });

  return resultado;
}

/**
 * Conta transações por tipo de pagamento
 * 
 * @param transacoes - Array de transações
 * @returns Contagem de à vista, parcelado e recorrente
 */
export function contarFormas(transacoes: Transacao[]): FormasPagamento {
  const resultado: FormasPagamento = { aVista: 0, parcelado: 0, recorrente: 0 };

  transacoes.forEach(t => {
    if (t.parcelado === true) {
      resultado.parcelado++;
    } else if (t.recorrente === true) {
      resultado.recorrente++;
    } else {
      resultado.aVista++;
    }
  });

  return resultado;
}

/**
 * Filtra apenas transações parceladas
 */
export function filtrarParceladas(transacoes: Transacao[]): Transacao[] {
  return transacoes.filter(t => t.parcelado === true);
}

/**
 * Retorna os maiores gastos (despesas) do período
 * 
 * @param transacoes - Array de transações
 * @param top - Número de resultados (padrão: 5)
 * @returns Array ordenado por valor (maior → menor)
 */
export function maioresGastos(transacoes: Transacao[], top = 5): Transacao[] {
  return transacoes
    .filter(t => t.tipo === 'saida')
    .sort((a, b) => Number(b.valor) - Number(a.valor))
    .slice(0, top);
}

/**
 * Agrupa transações por categoria com totais e contagem
 * 
 * @param transacoes - Array de transações
 * @param tipo - Filtrar por tipo (opcional)
 * @returns Array ordenado por total (maior → menor)
 */
export function agruparPorCategoria(
  transacoes: Transacao[],
  tipo?: 'entrada' | 'saida'
): CategoriaTotal[] {
  // Estorno abate a despesa da categoria da compra
  const filtradas = tipo
    ? transacoes.filter(t => t.tipo === tipo || (tipo === 'saida' && t.tipo === 'estorno'))
    : transacoes;

  const mapa: Record<string, { total: number; quantidade: number }> = {};

  filtradas.forEach(t => {
    const cat = t.categoria || 'Sem categoria';
    if (!mapa[cat]) {
      mapa[cat] = { total: 0, quantidade: 0 };
    }
    mapa[cat].total += t.tipo === 'estorno' ? -Number(t.valor) : Number(t.valor);
    if (t.tipo !== 'estorno') mapa[cat].quantidade++;
  });

  return Object.entries(mapa)
    .map(([categoria, dados]) => ({
      categoria,
      total: dados.total,
      quantidade: dados.quantidade,
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

/**
 * Retorna categorias de receitas agregadas
 */
export function categoriasReceita(transacoes: Transacao[]): CategoriaTotal[] {
  return agruparPorCategoria(transacoes, 'entrada');
}

/**
 * Retorna categorias de despesas agregadas
 */
export function categoriasDespesa(transacoes: Transacao[]): CategoriaTotal[] {
  return agruparPorCategoria(transacoes, 'saida');
}

/**
 * Formata valor para moeda brasileira
 * 
 * @param valor - Valor numérico
 * @returns String formatada (ex: "R$ 1.500,00")
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

