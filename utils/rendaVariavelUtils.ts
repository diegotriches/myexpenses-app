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

import { adicionarMeses } from "./dateUtils";

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

/** Mesmo arredondamento para positivos e negativos, sem o erro de ponto flutuante de n × 100. */
export function r2(n: number): number {
  if (!Number.isFinite(n)) return n;
  const absoluto = Math.abs(n);
  const texto = String(absoluto);
  const centavos = texto.includes("e") ? Math.round(absoluto * 100) : Math.round(Number(`${texto}e2`));
  const resultado = centavos / 100;
  return n < 0 && resultado !== 0 ? -resultado : resultado;
}

/** Valor financeiro da operação: compra = o que sai (com taxas); venda = o que entra (já sem taxas). */
export function totalOperacao(o: Pick<OperacaoRv, "tipo" | "quantidade" | "precoUnitario" | "taxas">): number {
  const bruto = o.quantidade * o.precoUnitario;
  return r2(o.tipo === "compra" ? bruto + o.taxas : bruto - o.taxas);
}

// No mesmo dia: compras, depois eventos que aumentam a posição, grupamento e, por último, vendas
function prioridadeNoDia(o: Pick<OperacaoRv, "tipo" | "evento">): number {
  if (o.tipo === "compra") return o.evento ? 1 : 0;
  return o.evento === "grupamento" ? 2 : 3;
}

export function ordenarOperacoes<T extends Pick<OperacaoRv, "id" | "data" | "tipo" | "evento">>(ops: T[]): T[] {
  return [...ops].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    const prioridade = prioridadeNoDia(a) - prioridadeNoDia(b);
    if (prioridade !== 0) return prioridade;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export interface VendaApurada {
  operacaoId: string;
  data: string;
  quantidade: number;
  valorBruto: number; // quantidade × preço
  valorLiquido: number; // quantidade × preço − taxas
  custoBaixa: number; // quantidade × preço médio
  resultado: number; // valorLiquido − custoBaixa
  dayTrade: boolean;
  estimada: boolean; // data do negócio estimada (importação da B3)
}

export type OperacaoApuravel = OperacaoRv & { dataEstimada?: boolean };

export interface ApuracaoTicker {
  quantidade: number;
  custoTotal: number;
  totalComprado: number;
  totalVendido: number;
  resultadoRealizado: number;
  vendas: VendaApurada[];
}

/**
 * Motor único de custo, usado pela carteira e pelo IR: pares de day trade
 * (mesmo ativo e mesmo dia, com data real) saem do preço médio; o restante
 * segue como operação comum, baixando o custo pelo preço médio.
 */
export function apurarTicker(lista: OperacaoApuravel[]): ApuracaoTicker {
  const porDia = new Map<string, OperacaoApuravel[]>();
  for (const o of lista) {
    const doDia = porDia.get(o.data) ?? [];
    doDia.push(o);
    porDia.set(o.data, doDia);
  }

  const vendas: VendaApurada[] = [];
  const comuns: OperacaoApuravel[] = [];
  let realizado = 0;
  let comprado = 0;
  let vendido = 0;

  for (const [data, doDia] of Array.from(porDia.entries())) {
    const elegiveis = doDia.filter((o) => !o.dataEstimada && !o.evento);
    const compras = elegiveis.filter((o) => o.tipo === "compra");
    const vendasDia = elegiveis.filter((o) => o.tipo === "venda");
    const qCompra = compras.reduce((s, o) => s + o.quantidade, 0);
    const qVenda = vendasDia.reduce((s, o) => s + o.quantidade, 0);
    const pareado = Math.min(qCompra, qVenda);

    if (pareado === 0) {
      comuns.push(...doDia);
      continue;
    }

    const base = doDia[0];
    const custoUnit = compras.reduce((s, o) => s + o.quantidade * o.precoUnitario + o.taxas, 0) / qCompra;
    const liquidoUnit = vendasDia.reduce((s, o) => s + o.quantidade * o.precoUnitario - o.taxas, 0) / qVenda;
    const brutoUnit = vendasDia.reduce((s, o) => s + o.quantidade * o.precoUnitario, 0) / qVenda;
    const resultado = pareado * (liquidoUnit - custoUnit);

    vendas.push({
      operacaoId: `dt-${base.ticker}-${data}`,
      data,
      quantidade: pareado,
      valorBruto: r2(pareado * brutoUnit),
      valorLiquido: r2(pareado * liquidoUnit),
      custoBaixa: r2(pareado * custoUnit),
      resultado: r2(resultado),
      dayTrade: true,
      estimada: false,
    });
    realizado += resultado;
    comprado += pareado * custoUnit;
    vendido += pareado * liquidoUnit;

    // O que sobra além do pareado segue como operação comum
    comuns.push(...doDia.filter((o) => o.dataEstimada || o.evento));
    if (qCompra > pareado) {
      comuns.push({ ...base, id: `${base.ticker}-${data}-c`, tipo: "compra", quantidade: qCompra - pareado, precoUnitario: custoUnit, taxas: 0, evento: null, dataEstimada: false });
    }
    if (qVenda > pareado) {
      const restante = qVenda - pareado;
      comuns.push({ ...base, id: `${base.ticker}-${data}-v`, tipo: "venda", quantidade: restante, precoUnitario: brutoUnit, taxas: restante * (brutoUnit - liquidoUnit), evento: null, dataEstimada: false });
    }
  }

  let qtd = 0;
  let custo = 0;

  for (const o of ordenarOperacoes(comuns)) {
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
      const valorBruto = o.quantidade * o.precoUnitario;
      const valorLiquido = valorBruto - o.taxas;
      const resultado = valorLiquido - custoBaixa;
      vendas.push({
        operacaoId: o.id,
        data: o.data,
        quantidade: o.quantidade,
        valorBruto: r2(valorBruto),
        valorLiquido: r2(valorLiquido),
        custoBaixa: r2(custoBaixa),
        resultado: r2(resultado),
        dayTrade: false,
        estimada: !!o.dataEstimada,
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

  vendas.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));

  return {
    quantidade: qtd,
    custoTotal: custo,
    totalComprado: comprado,
    totalVendido: vendido,
    resultadoRealizado: realizado,
    vendas,
  };
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

export function calcularPosicoes(ops: OperacaoApuravel[]): PosicaoAtivo[] {
  const porTicker = new Map<string, OperacaoApuravel[]>();
  for (const o of ops) {
    const lista = porTicker.get(o.ticker) ?? [];
    lista.push(o);
    porTicker.set(o.ticker, lista);
  }

  const posicoes: PosicaoAtivo[] = [];
  for (const [ticker, lista] of Array.from(porTicker.entries())) {
    const ordenadas = ordenarOperacoes(lista);
    const a = apurarTicker(lista);

    posicoes.push({
      ticker,
      tipoAtivo: ordenadas[ordenadas.length - 1].tipoAtivo,
      quantidade: a.quantidade,
      custoTotal: r2(a.custoTotal),
      precoMedio: a.quantidade > 0 ? a.custoTotal / a.quantidade : 0,
      totalComprado: r2(a.totalComprado),
      totalVendido: r2(a.totalVendido),
      resultadoRealizado: r2(a.resultadoRealizado),
      vendas: a.vendas,
    });
  }

  return posicoes.sort((a, b) => (a.ticker < b.ticker ? -1 : 1));
}

// Por quanto tempo uma posição encerrada segue em destaque. Cobre com folga o
// intervalo entre a data-com e o pagamento de um provento.
export const MESES_ENCERRAMENTO_RECENTE = 6;

/** Data da última venda da posição (null se saiu da carteira sem venda). */
export function dataEncerramento(p: Pick<PosicaoAtivo, "vendas">): string | null {
  return p.vendas.length ? p.vendas[p.vendas.length - 1].data : null;
}

export function encerramentoRecente(p: Pick<PosicaoAtivo, "vendas">, hoje: string): boolean {
  const data = dataEncerramento(p);
  if (!data) return false;
  const limite = adicionarMeses(new Date(`${hoje}T00:00:00Z`), -MESES_ENCERRAMENTO_RECENTE).toISOString().slice(0, 10);
  return data >= limite;
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