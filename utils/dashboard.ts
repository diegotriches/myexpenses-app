import { Transacao } from "@/types/transacao";

// ✅ Interfaces corrigidas para o dashboard
export interface DashboardResumo {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  quantidadeReceitas: number;
  quantidadeDespesas: number;
}

export interface CondicoesPagamento {
  dinheiro: number;
  pix: number;
  cartao: number;
}

export interface FormasPagamento {
  aVista: number;
  parcelado: number;
  recorrente: number;
}

export interface CategoriaTotal {
  categoria: string;
  total: number;
  quantidade: number;
}

// ✅ Resumo geral do período
export function calcularResumo(transacoes: Transacao[]): DashboardResumo {
  const receitas = transacoes.filter(t => t.tipo === 'entrada');
  const despesas = transacoes.filter(t => t.tipo === 'saida');

  const totalReceitas = receitas.reduce((acc, t) => acc + Number(t.valor), 0);
  const totalDespesas = despesas.reduce((acc, t) => acc + Number(t.valor), 0);

  return {
    totalReceitas,
    totalDespesas,
    saldo: totalReceitas - totalDespesas,
    quantidadeReceitas: receitas.length,
    quantidadeDespesas: despesas.length,
  };
}

// ✅ Calcula dados para gráfico de últimos 6 meses
export function calcularGraficoMeses(
  transacoes: Transacao[],
  mesesAtras: number = 6
): {
  mes: string;
  receitas: number;
  despesas: number;
  balanco: number;
}[] {
  const hoje = new Date();
  const meses: {
    mes: string;
    receitas: number;
    despesas: number;
    balanco: number;
  }[] = [];

  // Gera os últimos N meses
  for (let i = mesesAtras - 1; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;

    // Filtra transações do mês
    const transacoesMes = transacoes.filter(t => t.data.startsWith(mesAno));

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

// ✅ Últimas N transações (ordenadas por data)
export function ultimasTransacoes(transacoes: Transacao[], n = 5): Transacao[] {
  return [...transacoes]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, n);
}

// ✅ Contagem por forma de pagamento (dinheiro, pix, cartão)
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

// ✅ Contagem por tipo de pagamento (à vista, parcelado, recorrente)
export function contarFormas(transacoes: Transacao[]): FormasPagamento {
  const resultado: FormasPagamento = { aVista: 0, parcelado: 0, recorrente: 0 };

  transacoes.forEach(t => {
    if (t.parcelado) {
      resultado.parcelado++;
    } else if (t.recorrente) {
      resultado.recorrente++;
    } else {
      resultado.aVista++;
    }
  });

  return resultado;
}

// ✅ Filtrar transações recorrentes
export function filtrarRecorrentes(transacoes: Transacao[]): Transacao[] {
  return transacoes.filter(t => t.recorrente);
}

// ✅ Filtrar transações parceladas
export function filtrarParceladas(transacoes: Transacao[]): Transacao[] {
  return transacoes.filter(t => t.parcelado);
}

// ✅ Maiores gastos (despesas) do período
export function maioresGastos(transacoes: Transacao[], top = 5): Transacao[] {
  return transacoes
    .filter(t => t.tipo === 'saida')
    .sort((a, b) => Number(b.valor) - Number(a.valor))
    .slice(0, top);
}

// ✅ Agrupa transações por categoria (com totais e contagem)
export function agruparPorCategoria(
  transacoes: Transacao[],
  tipo?: 'entrada' | 'saida'
): CategoriaTotal[] {
  const filtradas = tipo ? transacoes.filter(t => t.tipo === tipo) : transacoes;

  const mapa: Record<string, { total: number; quantidade: number }> = {};

  filtradas.forEach(t => {
    const cat = t.categoria || 'Sem categoria';
    if (!mapa[cat]) {
      mapa[cat] = { total: 0, quantidade: 0 };
    }
    mapa[cat].total += Number(t.valor);
    mapa[cat].quantidade++;
  });

  return Object.entries(mapa)
    .map(([categoria, dados]) => ({
      categoria,
      total: dados.total,
      quantidade: dados.quantidade,
    }))
    .sort((a, b) => b.total - a.total);
}

// ✅ Categorias de receitas
export function categoriasReceita(transacoes: Transacao[]): CategoriaTotal[] {
  return agruparPorCategoria(transacoes, 'entrada');
}

// ✅ Categorias de despesas
export function categoriasDespesa(transacoes: Transacao[]): CategoriaTotal[] {
  return agruparPorCategoria(transacoes, 'saida');
}

// ✅ Calcula total de despesas com cartão (para faturas)
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

// ✅ Separa valores recebidos vs a pagar
export function calcularValores(transacoes: Transacao[]): {
  recebidos: number;
  aPagar: number;
} {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const recebidos = transacoes
    .filter(t => t.tipo === 'entrada' && new Date(t.data) <= hoje)
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const aPagar = transacoes
    .filter(t => t.tipo === 'saida' && new Date(t.data) > hoje)
    .reduce((acc, t) => acc + Number(t.valor), 0);

  return { recebidos, aPagar };
}

// ✅ Formata valor para moeda brasileira
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

// ✅ Agrupa transações por mês (para gráficos)
export function agruparPorMes(transacoes: Transacao[]): {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
}[] {
  const mapa: Record<string, { receitas: number; despesas: number }> = {};

  transacoes.forEach(t => {
    const mesAno = t.data.substring(0, 7); // YYYY-MM
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