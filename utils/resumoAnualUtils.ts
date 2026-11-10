// Agregação do Resumo Anual (receitas, despesas, categorias e formas de pagamento).
//
// Competência de cada lançamento:
//  - compra e estorno no cartão de crédito: mês da FATURA (como o resumo mensal
//    do dashboard). Uma compra depois do fechamento de dezembro entra em janeiro
//    do ano seguinte, por isso a rota busca a partir de 1º de dezembro do ano
//    anterior;
//  - o resto: mês da data do lançamento.
// Estorno abate a despesa, a categoria da compra e a forma "cartão".
// `ateMes` limita o período (no ano corrente, até o mês atual), para comparar
// anos no mesmo intervalo e não contar parcelas futuras.

import { calcularFaturaDaTransacao } from "./faturaUtils";

export interface TransacaoResumo {
  id: string;
  tipo: string; // entrada | saida | estorno
  valor: string | number;
  data: string | Date;
  descricao: string | null;
  categoria: string | null;
  formaPagamento: string | null;
  cartaoId: number | null;
}

export interface CartaoResumo {
  id: number;
  tipo: string;
  diaFechamento: number | null;
}

export interface MesResumo {
  mes: number;
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface CategoriaAnual {
  categoria: string;
  total: number;
  percentual: number;
}

export interface MetodoAnual {
  metodo: string;
  quantidade: number;
  total: number;
  percentual: number;
}

export interface AgregadoAno<T extends TransacaoResumo> {
  meses: MesResumo[];
  totais: { receitas: number; despesas: number; saldo: number };
  categorias: CategoriaAnual[];
  metodosPagamento: MetodoAnual[];
  maiorReceita: T | null;
  maiorDespesa: T | null;
  mediaMensal: { receitas: number; despesas: number };
  melhorMes: { mes: number; saldo: number } | null;
  piorMes: { mes: number; saldo: number } | null;
}

const centavos = (v: number) => Math.round(v * 100) / 100;
const iso = (d: string | Date) => (typeof d === "string" ? d : d.toISOString()).slice(0, 10);
export const SEM_CATEGORIA = "Sem categoria";

/** Ano e mês em que o lançamento conta no resumo. */
export function competencia(t: TransacaoResumo, cartoes: Map<number, CartaoResumo>): { ano: number; mes: number } {
  const data = iso(t.data);
  const cartao = t.cartaoId !== null ? cartoes.get(t.cartaoId) : undefined;
  if ((t.tipo === "saida" || t.tipo === "estorno") && cartao?.tipo === "credito") {
    return calcularFaturaDaTransacao(data, cartao.diaFechamento || 1);
  }
  const [ano, mes] = data.split("-").map(Number);
  return { ano, mes };
}

function participacao(mapa: Map<string, number>) {
  const positivos = Array.from(mapa.entries()).filter(([, v]) => v > 0.004);
  const soma = positivos.reduce((s, [, v]) => s + v, 0) || 1;
  return positivos
    .map(([chave, total]) => ({ chave, total: centavos(total), percentual: Math.round((total / soma) * 100) }))
    .sort((a, b) => b.total - a.total);
}

export function agregarAno<T extends TransacaoResumo>(
  transacoes: T[],
  cartoes: Map<number, CartaoResumo>,
  ano: number,
  ateMes = 12,
): AgregadoAno<T> {
  const meses: MesResumo[] = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, receitas: 0, despesas: 0, saldo: 0 }));
  const categorias = new Map<string, number>();
  const metodos = new Map<string, { quantidade: number; total: number }>();
  let maiorReceita: T | null = null;
  let maiorDespesa: T | null = null;

  for (const t of transacoes) {
    const c = competencia(t, cartoes);
    if (c.ano !== ano || c.mes > ateMes) continue;
    const valor = Number(t.valor);
    const mes = meses[c.mes - 1];
    const categoria = t.categoria || SEM_CATEGORIA;
    const metodo = t.formaPagamento || "dinheiro";

    if (t.tipo === "entrada") {
      mes.receitas += valor;
      if (!maiorReceita || valor > Number(maiorReceita.valor)) maiorReceita = t;
    } else if (t.tipo === "saida") {
      mes.despesas += valor;
      categorias.set(categoria, (categorias.get(categoria) ?? 0) + valor);
      const m = metodos.get(metodo) ?? { quantidade: 0, total: 0 };
      metodos.set(metodo, { quantidade: m.quantidade + 1, total: m.total + valor });
      if (!maiorDespesa || valor > Number(maiorDespesa.valor)) maiorDespesa = t;
    } else if (t.tipo === "estorno") {
      mes.despesas -= valor;
      categorias.set(categoria, (categorias.get(categoria) ?? 0) - valor);
      const m = metodos.get("cartao") ?? { quantidade: 0, total: 0 };
      metodos.set("cartao", { quantidade: m.quantidade, total: m.total - valor });
    }
  }

  for (const m of meses) {
    m.receitas = centavos(m.receitas);
    m.despesas = centavos(m.despesas);
    m.saldo = centavos(m.receitas - m.despesas);
  }

  const totais = meses.reduce(
    (acc, m) => ({ receitas: acc.receitas + m.receitas, despesas: acc.despesas + m.despesas, saldo: acc.saldo + m.saldo }),
    { receitas: 0, despesas: 0, saldo: 0 },
  );

  const comMovimento = meses.filter((m) => m.receitas > 0 || m.despesas > 0);
  const melhor = comMovimento.length ? comMovimento.reduce((a, b) => (b.saldo > a.saldo ? b : a)) : null;
  const pior = comMovimento.length ? comMovimento.reduce((a, b) => (b.saldo < a.saldo ? b : a)) : null;
  const mesesComReceita = meses.filter((m) => m.receitas > 0).length || 1;
  const mesesComDespesa = meses.filter((m) => m.despesas > 0).length || 1;

  return {
    meses,
    totais: { receitas: centavos(totais.receitas), despesas: centavos(totais.despesas), saldo: centavos(totais.saldo) },
    categorias: participacao(categorias).map(({ chave, total, percentual }) => ({ categoria: chave, total, percentual })),
    metodosPagamento: participacao(new Map(Array.from(metodos.entries()).map(([k, v]) => [k, v.total])))
      .map(({ chave, total, percentual }) => ({ metodo: chave, quantidade: metodos.get(chave)?.quantidade ?? 0, total, percentual })),
    maiorReceita,
    maiorDespesa,
    mediaMensal: { receitas: centavos(totais.receitas / mesesComReceita), despesas: centavos(totais.despesas / mesesComDespesa) },
    melhorMes: melhor ? { mes: melhor.mes, saldo: melhor.saldo } : null,
    piorMes: pior ? { mes: pior.mes, saldo: pior.saldo } : null,
  };
}

export interface CategoriaComparativa extends CategoriaAnual {
  totalAnterior: number;
  variacao: number | null; // % sobre o mesmo período do ano anterior; null = não havia gasto
}

/** Categorias do ano com o total do mesmo período do ano anterior. */
export function compararCategorias(atual: CategoriaAnual[], anterior: CategoriaAnual[]): CategoriaComparativa[] {
  const antes = new Map(anterior.map((c) => [c.categoria, c.total]));
  return atual.map((c) => {
    const totalAnterior = antes.get(c.categoria) ?? 0;
    return {
      ...c,
      totalAnterior,
      variacao: totalAnterior > 0 ? Math.round(((c.total - totalAnterior) / totalAnterior) * 100) : null,
    };
  });
}

/** Rótulo do período comparado: "jan–nov de 2025" ou só "2025" quando o ano é completo. */
export function rotuloPeriodo(ano: number, ateMes: number): string {
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  if (ateMes >= 12) return String(ano);
  return ateMes === 1 ? `jan de ${ano}` : `jan–${nomes[ateMes - 1]} de ${ano}`;
}
