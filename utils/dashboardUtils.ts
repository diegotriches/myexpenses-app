// src/utils/dashboardUtils.ts

import { Transacao } from "@/types/transacao";
import type {
  DashboardResumo,
  CondicoesPagamento,
  FormasPagamento,
  CategoriaTotal,
  DadosGraficoMeses,
} from "@/types/dashboard";

// ========================================
// FUNÇÕES DE CÁLCULO
// ========================================

/**
 * Calcula resumo financeiro do período
 * 
 * @param transacoes - Array de transações
 * @returns Totais de receitas, despesas, saldo e quantidades
 * 
 * @example
 * const resumo = calcularResumo(transacoes);
 * console.log(resumo.saldo); // 500
 */
export function calcularResumo(transacoes: Transacao[]): DashboardResumo {
  const receitas = transacoes.filter(t => t.tipo === 'entrada');
  const despesas = transacoes.filter(t => t.tipo === 'saida');

  const totalReceitas = receitas.reduce((acc, t) => acc + Number(t.valor), 0);
  const totalDespesas = despesas.reduce((acc, t) => acc + Number(t.valor), 0);

  return {
    receitas: totalReceitas,
    despesas: totalDespesas,
    saldo: totalReceitas - totalDespesas,
    quantidadeReceitas: receitas.length,
    quantidadeDespesas: despesas.length,
  };
}

/**
 * Calcula dados para gráfico dos últimos N meses
 * 
 * @param transacoes - Array de transações
 * @param mesesAtras - Número de meses (padrão: 6)
 * @returns Array com dados de cada mês
 * 
 * @example
 * const grafico = calcularGraficoMeses(transacoes, 12);
 */
export function calcularGraficoMeses(
  transacoes: Transacao[],
  mesesAtras: number = 6
): DadosGraficoMeses[] {
  const hoje = new Date();
  const meses: DadosGraficoMeses[] = [];

  // Gera os últimos N meses
  for (let i = mesesAtras - 1; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;

    // Filtra transações do mês
    const transacoesMes = transacoes.filter(t => {
      const dataStr = typeof t.data === 'string' ? t.data : t.data.toISOString();
      return dataStr.startsWith(mesAno);
    });

    const receitas = transacoesMes
      .filter(t => t.tipo === 'entrada')
      .reduce((acc, t) => acc + Number(t.valor), 0);

    const despesas = transacoesMes
      .filter(t => t.tipo === 'saida')
      .reduce((acc, t) => acc + Number(t.valor), 0);

    meses.push({
      mes: mesAno,
      receitas,
      despesas,
      balanco: receitas - despesas
    });
  }

  return meses;
}

/**
 * Retorna as últimas N transações ordenadas por data
 * 
 * @param transacoes - Array de transações
 * @param n - Número de transações (padrão: 5)
 * @returns Array ordenado das últimas transações
 */
export function ultimasTransacoes(transacoes: Transacao[], n = 5): Transacao[] {
  return [...transacoes]
    .sort((a, b) => {
      const dataA = typeof a.data === 'string' ? new Date(a.data) : a.data;
      const dataB = typeof b.data === 'string' ? new Date(b.data) : b.data;
      return dataB.getTime() - dataA.getTime();
    })
    .slice(0, n);
}

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
 * Filtra apenas transações recorrentes
 */
export function filtrarRecorrentes(transacoes: Transacao[]): Transacao[] {
  return transacoes.filter(t => t.recorrente === true);
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
 * Calcula total de despesas com cartão (para faturas)
 * 
 * @param transacoes - Array de transações
 * @returns Total geral e total por cartão
 */
export function calcularFaturas(transacoes: Transacao[]): {
  total: number;
  porCartao: Record<number, number>;
} {
  const despesasCartao = transacoes.filter(
    t => t.tipo === 'saida' && t.formaPagamento === 'cartao' && t.cartaoId
  );

  const total = despesasCartao.reduce((acc, t) => acc + Number(t.valor), 0);

  const porCartao: Record<number, number> = {};
  despesasCartao.forEach(t => {
    if (t.cartaoId) {
      porCartao[t.cartaoId] = (porCartao[t.cartaoId] || 0) + Number(t.valor);
    }
  });

  return { total, porCartao };
}

/**
 * Separa valores recebidos (passado) vs a pagar (futuro)
 * 
 * @param transacoes - Array de transações
 * @returns Valores recebidos e a pagar
 */
export function calcularValores(transacoes: Transacao[]): {
  recebidos: number;
  aPagar: number;
} {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const recebidos = transacoes
    .filter(t => {
      const data = typeof t.data === 'string' ? new Date(t.data) : t.data;
      return t.tipo === 'entrada' && data <= hoje;
    })
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const aPagar = transacoes
    .filter(t => {
      const data = typeof t.data === 'string' ? new Date(t.data) : t.data;
      return t.tipo === 'saida' && data > hoje;
    })
    .reduce((acc, t) => acc + Number(t.valor), 0);

  return { recebidos, aPagar };
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

/**
 * Agrupa transações por mês (para gráficos)
 * 
 * @param transacoes - Array de transações
 * @returns Array ordenado por mês
 */
export function agruparPorMes(transacoes: Transacao[]): {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
}[] {
  const mapa: Record<string, { receitas: number; despesas: number }> = {};

  transacoes.forEach(t => {
    const dataStr = typeof t.data === 'string' ? t.data : t.data.toISOString();
    const mesAno = dataStr.substring(0, 7); // YYYY-MM
    
    if (!mapa[mesAno]) {
      mapa[mesAno] = { receitas: 0, despesas: 0 };
    }

    if (t.tipo === 'entrada') {
      mapa[mesAno].receitas += Number(t.valor);
    } else {
      mapa[mesAno].despesas += Number(t.valor);
    }
  });

  return Object.entries(mapa)
    .map(([mes, dados]) => ({
      mes,
      receitas: dados.receitas,
      despesas: dados.despesas,
      saldo: dados.receitas - dados.despesas,
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

/**
 * Calcula percentual de crescimento entre dois valores
 * 
 * @param valorAtual - Valor atual
 * @param valorAnterior - Valor anterior
 * @returns Percentual de crescimento (positivo ou negativo)
 */
export function calcularCrescimento(
  valorAtual: number,
  valorAnterior: number
): number {
  if (valorAnterior === 0) return valorAtual > 0 ? 100 : 0;
  return ((valorAtual - valorAnterior) / valorAnterior) * 100;
}

/**
 * Formata percentual com sinal
 * 
 * @param percentual - Valor do percentual
 * @returns String formatada (ex: "+15.5%" ou "-5.2%")
 */
export function formatarPercentual(percentual: number): string {
  const sinal = percentual >= 0 ? '+' : '';
  return `${sinal}${percentual.toFixed(1)}%`;
}