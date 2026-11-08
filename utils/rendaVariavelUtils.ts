// src/utils/rendaVariavelUtils.ts
//
// Regras de cálculo da renda variável (ações, FIIs, ETFs e BDRs).
//  - Posição e preço médio são SEMPRE recalculados a partir das operações.
//  - Preço médio por CPF (carteira única, todas as corretoras).
//  - Compra: custo = quantidade × preço + taxas (as taxas entram no preço médio).
//  - Venda: baixa o custo pelo preço médio vigente; o preço médio NÃO muda.
//    Resultado da venda = (quantidade × preço − taxas) − custo baixado.
//  - Ordem dentro do mesmo dia: compras antes das vendas (permite day trade
//    e evita "venda sem saldo" quando as duas ocorrem no mesmo pregão).

export type TipoAtivo = "acao" | "fii" | "etf" | "bdr";
export type TipoOperacao = "compra" | "venda";

// Eventos corporativos, guardados como operações marcadas com `evento`:
//  - desdobramento: "compra" de preço zero (quantidade sobe, custo total igual)
//  - bonificação: "compra" ao custo atribuído por ação (pode ser zero)
//  - grupamento: "venda" que só reduz a quantidade; o custo total é mantido e
//    NÃO conta como venda (sem resultado, sem imposto)
export type EventoOperacao = "desdobramento" | "bonificacao" | "grupamento";

export const EVENTO_LABEL: Record<EventoOperacao, string> = {
  desdobramento: "Desdobramento",
  bonificacao: "Bonificação",
  grupamento: "Grupamento",
};

export const TIPO_ATIVO_LABEL: Record<TipoAtivo, string> = {
  acao: "Ação",
  fii: "FII",
  etf: "ETF",
  bdr: "BDR",
};

export interface OperacaoRv {
  id: string;
  ticker: string;
  tipoAtivo: TipoAtivo;
  tipo: TipoOperacao;
  data: string; // YYYY-MM-DD
  quantidade: number;
  precoUnitario: number;
  taxas: number;
  evento?: EventoOperacao | null;
}

export interface CotacaoRv {
  ticker: string;
  preco: number;
  variacaoDia: number | null;
  fonte: string;
  atualizadoEm: string; // ISO
}

// Ex.: PETR4, VALE3, BRCR11, B3SA3, AAPL34
export const TICKER_REGEX = /^[A-Z][A-Z0-9]{3}\d{1,2}$/;

export const normalizarTicker = (t: string) => t.trim().toUpperCase();

/** Sugestão inicial pelo sufixo do ticker (o usuário pode trocar). */
export function sugerirTipoAtivo(ticker: string): TipoAtivo {
  const t = normalizarTicker(ticker);
  if (/(32|33|34|35|39)$/.test(t)) return "bdr";
  if (/11$/.test(t)) return "fii"; // ETFs e units também terminam em 11
  return "acao";
}

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Valor financeiro da operação: compra = o que sai (com taxas); venda = o que entra (já sem taxas). */
export function totalOperacao(o: Pick<OperacaoRv, "tipo" | "quantidade" | "precoUnitario" | "taxas">): number {
  const bruto = o.quantidade * o.precoUnitario;
  return r2(o.tipo === "compra" ? bruto + o.taxas : bruto - o.taxas);
}

export function ordenarOperacoes<T extends Pick<OperacaoRv, "id" | "data" | "tipo">>(ops: T[]): T[] {
  return [...ops].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    if (a.tipo !== b.tipo) return a.tipo === "compra" ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export interface VendaApurada {
  operacaoId: string;
  data: string;
  quantidade: number;
  valorLiquido: number; // quantidade × preço − taxas
  custoBaixa: number; // quantidade × preço médio
  resultado: number; // valorLiquido − custoBaixa
}

export interface PosicaoAtivo {
  ticker: string;
  tipoAtivo: TipoAtivo;
  quantidade: number;
  custoTotal: number;
  precoMedio: number;
  totalComprado: number; // soma das compras (com taxas)
  totalVendido: number; // soma das vendas (líquido de taxas)
  resultadoRealizado: number;
  vendas: VendaApurada[];
}

export function calcularPosicoes(ops: OperacaoRv[]): PosicaoAtivo[] {
  const porTicker = new Map<string, OperacaoRv[]>();
  for (const o of ops) {
    const lista = porTicker.get(o.ticker) ?? [];
    lista.push(o);
    porTicker.set(o.ticker, lista);
  }

  const posicoes: PosicaoAtivo[] = [];
  for (const [ticker, lista] of Array.from(porTicker.entries())) {
    let qtd = 0;
    let custo = 0;
    let realizado = 0;
    let comprado = 0;
    let vendido = 0;
    const vendas: VendaApurada[] = [];
    const ordenadas = ordenarOperacoes(lista);

    for (const o of ordenadas) {
      if (o.tipo === "compra") {
        const c = o.quantidade * o.precoUnitario + o.taxas;
        qtd += o.quantidade;
        custo += c;
        comprado += c;
      } else if (o.evento === "grupamento") {
        // reduz a quantidade mantendo o custo total (o preço médio sobe)
        qtd = Math.max(0, qtd - o.quantidade);
        if (qtd === 0) custo = 0;
      } else {
        const pm = qtd > 0 ? custo / qtd : 0;
        const custoBaixa = pm * o.quantidade;
        const valorLiquido = o.quantidade * o.precoUnitario - o.taxas;
        const resultado = valorLiquido - custoBaixa;
        vendas.push({
          operacaoId: o.id,
          data: o.data,
          quantidade: o.quantidade,
          valorLiquido: r2(valorLiquido),
          custoBaixa: r2(custoBaixa),
          resultado: r2(resultado),
        });
        realizado += resultado;
        vendido += valorLiquido;
        qtd -= o.quantidade;
        custo -= custoBaixa;
        if (qtd <= 0) {
          qtd = 0;
          custo = 0;
        }
      }
    }

    posicoes.push({
      ticker,
      tipoAtivo: ordenadas[ordenadas.length - 1].tipoAtivo,
      quantidade: qtd,
      custoTotal: r2(custo),
      precoMedio: qtd > 0 ? custo / qtd : 0,
      totalComprado: r2(comprado),
      totalVendido: r2(vendido),
      resultadoRealizado: r2(realizado),
      vendas,
    });
  }

  return posicoes.sort((a, b) => (a.ticker < b.ticker ? -1 : 1));
}

export interface ErroSequencia {
  ticker: string;
  data: string;
  faltam: number; // quantas unidades a venda excede a posição
}

/**
 * Confere se a lista de operações nunca vende mais do que a posição daquele
 * momento. Devolve o primeiro problema encontrado, ou null se está tudo certo.
 */
export function validarSequencia(ops: OperacaoRv[]): ErroSequencia | null {
  const porTicker = new Map<string, OperacaoRv[]>();
  for (const o of ops) {
    const lista = porTicker.get(o.ticker) ?? [];
    lista.push(o);
    porTicker.set(o.ticker, lista);
  }
  for (const [ticker, lista] of Array.from(porTicker.entries())) {
    let qtd = 0;
    for (const o of ordenarOperacoes(lista)) {
      qtd += o.tipo === "compra" ? o.quantidade : -o.quantidade;
      if (qtd < 0) return { ticker, data: o.data, faltam: -qtd };
    }
  }
  return null;
}

export interface AtivoCarteira extends PosicaoAtivo {
  cotacao: number | null;
  cotacaoFonte: string | null;
  cotacaoAtualizadaEm: string | null;
  variacaoDia: number | null;
  valorMercado: number; // sem cotação usa o preço médio (resultado não realizado = 0)
  resultadoNaoRealizado: number;
  resultadoPct: number;
}

export interface ResumoCarteira {
  ativos: AtivoCarteira[]; // posições abertas
  encerrados: PosicaoAtivo[]; // posições zeradas (têm resultado realizado)
  valorMercado: number;
  custoTotal: number;
  resultadoNaoRealizado: number;
  resultadoNaoRealizadoPct: number;
  resultadoRealizado: number;
  semCotacao: number; // quantos ativos abertos ainda sem cotação
}

export function resumirCarteira(ops: OperacaoRv[], cotacoes: CotacaoRv[]): ResumoCarteira {
  const cot = new Map(cotacoes.map((c) => [c.ticker, c]));
  const posicoes = calcularPosicoes(ops);

  const ativos: AtivoCarteira[] = [];
  const encerrados: PosicaoAtivo[] = [];
  let valorMercado = 0;
  let custoTotal = 0;
  let semCotacao = 0;
  let realizado = 0;

  for (const p of posicoes) {
    realizado += p.resultadoRealizado;
    if (p.quantidade <= 0) {
      encerrados.push(p);
      continue;
    }
    const c = cot.get(p.ticker);
    const preco = c ? c.preco : null;
    const vm = preco !== null ? p.quantidade * preco : p.custoTotal;
    const rn = preco !== null ? vm - p.custoTotal : 0;
    if (preco === null) semCotacao++;

    ativos.push({
      ...p,
      cotacao: preco,
      cotacaoFonte: c?.fonte ?? null,
      cotacaoAtualizadaEm: c?.atualizadoEm ?? null,
      variacaoDia: c?.variacaoDia ?? null,
      valorMercado: r2(vm),
      resultadoNaoRealizado: r2(rn),
      resultadoPct: p.custoTotal > 0 ? (rn / p.custoTotal) * 100 : 0,
    });
    valorMercado += vm;
    custoTotal += p.custoTotal;
  }

  const rnTotal = valorMercado - custoTotal;
  return {
    ativos,
    encerrados,
    valorMercado: r2(valorMercado),
    custoTotal: r2(custoTotal),
    resultadoNaoRealizado: r2(rnTotal),
    resultadoNaoRealizadoPct: custoTotal > 0 ? (rnTotal / custoTotal) * 100 : 0,
    resultadoRealizado: r2(realizado),
    semCotacao,
  };
}