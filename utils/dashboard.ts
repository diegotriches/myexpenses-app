import { Transacao, DashboardResumo, CondicaoPagamento, FormaPagamento } from './types';

// Resumo geral
export function calcularResumo(transacoes: Transacao[]): DashboardResumo {
  const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + t.valor, 0);
  const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + t.valor, 0);
  return { receitas, despesas, balanco: receitas - despesas };
}

// Últimas N transações
export function ultimasTransacoes(transacoes: Transacao[], n = 5) {
  return [...transacoes]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, n);
}

// Contagem por condição de pagamento
export function contarCondicoes(transacoes: Transacao[]): Record<CondicaoPagamento, number> {
  const resultado: Record<CondicaoPagamento, number> = { dinheiro: 0, pix: 0, cartao: 0 };
  transacoes.forEach(t => resultado[t.condicaoPagamento]++);
  return resultado;
}

// Contagem por forma de pagamento
export function contarFormas(transacoes: Transacao[]): Record<FormaPagamento, number> {
  const resultado: Record<FormaPagamento, number> = { aVista: 0, parcelado: 0, recorrente: 0 };
  transacoes.forEach(t => resultado[t.formaPagamento]++);
  return resultado;
}

// Filtrar recorrentes ou parcelados
export function filtrarPorTipo(transacoes: Transacao[], tipo: 'recorrente' | 'parcelado') {
  return transacoes.filter(t => t[tipo]);
}

// Maiores gastos do mês (YYYY-MM)
export function maioresGastos(transacoes: Transacao[], mesAno: string, top = 5) {
  return transacoes
    .filter(t => t.tipo === 'despesa' && t.data.startsWith(mesAno))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, top);
}

// Categorias mais lançadas ou maiores receitas/despesas
export function categoriasMais(transacoes: Transacao[], tipo?: 'receita' | 'despesa') {
  const filtro = tipo ? transacoes.filter(t => t.tipo === tipo) : transacoes;
  const mapa: Record<string, number> = {};
  filtro.forEach(t => (mapa[t.categoria] = (mapa[t.categoria] || 0) + t.valor));
  return Object.entries(mapa)
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}