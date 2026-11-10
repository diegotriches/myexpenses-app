// Gasto do mês por categoria comparado com a média dos meses anteriores.
//
// A comparação é feita durante o mês: o valor atual é o acumulado até hoje, e
// a média é a de meses completos. Categoria que já passou da média antes de o
// mês acabar é sinal de atenção. Estorno abate a categoria da compra, como nos
// demais relatórios. A média só conta meses a partir do primeiro gasto
// registrado, para quem começou a usar o app há pouco não ter médias diluídas.

export interface GastoParaComparar {
  tipo: string;
  valor: string | number;
  data: string | Date;
  categoria?: string | null;
}

export interface CategoriaComparada {
  categoria: string;
  atual: number;
  media: number;
  percentual: number | null; // atual ÷ média × 100; null = categoria sem histórico
}

export interface ComparacaoCategorias {
  mesAtual: string; // YYYY-MM
  mesesConsiderados: number;
  itens: CategoriaComparada[];
}

const mesDe = (data: string | Date) => (typeof data === "string" ? data : data.toISOString()).slice(0, 7);
const centavos = (v: number) => Math.round(v * 100) / 100;

function mesesAnteriores(mes: string, n: number): string[] {
  let [ano, m] = mes.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    m -= 1;
    if (m === 0) { m = 12; ano -= 1; }
    out.push(`${ano}-${String(m).padStart(2, "0")}`);
  }
  return out;
}

export function compararCategoriasComMedia(
  transacoes: GastoParaComparar[],
  hoje: string,
  meses = 6,
): ComparacaoCategorias {
  const mesAtual = hoje.slice(0, 7);
  const gastos = transacoes.filter((t) => t.tipo === "saida" || t.tipo === "estorno");
  const primeiroMes = gastos.reduce<string | null>((min, t) => {
    const m = mesDe(t.data);
    return min === null || m < min ? m : min;
  }, null);

  const base = new Set(mesesAnteriores(mesAtual, meses).filter((m) => primeiroMes !== null && m >= primeiroMes));
  const atual = new Map<string, number>();
  const historico = new Map<string, number>();

  for (const t of gastos) {
    const mes = mesDe(t.data);
    const valor = t.tipo === "estorno" ? -Number(t.valor) : Number(t.valor);
    const categoria = t.categoria || "Sem categoria";
    if (mes === mesAtual) atual.set(categoria, (atual.get(categoria) ?? 0) + valor);
    else if (base.has(mes)) historico.set(categoria, (historico.get(categoria) ?? 0) + valor);
  }

  const itens: CategoriaComparada[] = [];
  for (const [categoria, valorAtual] of Array.from(atual.entries())) {
    if (valorAtual <= 0) continue;
    const media = base.size > 0 ? (historico.get(categoria) ?? 0) / base.size : 0;
    itens.push({
      categoria,
      atual: centavos(valorAtual),
      media: centavos(media),
      percentual: media > 0 ? Math.round((valorAtual / media) * 100) : null,
    });
  }

  // Primeiro as que mais passaram da média; sem histórico ficam no fim, pelo valor
  itens.sort((a, b) => {
    if (a.percentual === null && b.percentual === null) return b.atual - a.atual;
    if (a.percentual === null) return 1;
    if (b.percentual === null) return -1;
    return b.percentual - a.percentual || b.atual - a.atual;
  });

  return { mesAtual, mesesConsiderados: base.size, itens };
}

/** Taxa de poupança do período: quanto da receita sobrou (negativa quando gastou mais do que recebeu). */
export function taxaDePoupanca(receitas: number, despesas: number): number | null {
  if (!(receitas > 0)) return null;
  return Math.round(((receitas - despesas) / receitas) * 100);
}
