import { describe, expect, it } from "vitest";
import {
  apurarTicker,
  calcularPosicoes,
  ordenarOperacoes,
  r2,
  totalOperacao,
  validarSequencia,
  type OperacaoApuravel,
} from "@/utils/rendaVariavelUtils";
import { calcularEvento, posicaoEm } from "@/utils/eventosCorporativosUtils";

let seq = 0;
const op = (o: Partial<OperacaoApuravel> & Pick<OperacaoApuravel, "tipo" | "data" | "quantidade" | "precoUnitario">): OperacaoApuravel => ({
  id: `op${String(++seq).padStart(3, "0")}`,
  ticker: "PETR4",
  tipoAtivo: "acao",
  taxas: 0,
  evento: null,
  ...o,
});

describe("r2", () => {
  it("arredonda meio centavo para cima, igual para positivos e negativos", () => {
    expect(r2(1.005)).toBe(1.01);
    expect(r2(2.675)).toBe(2.68);
    expect(r2(-1.005)).toBe(-1.01);
    expect(r2(-0.001)).toBe(0);
  });
});

describe("totalOperacao", () => {
  it("compra soma as taxas e venda desconta", () => {
    expect(totalOperacao({ tipo: "compra", quantidade: 100, precoUnitario: 10, taxas: 5 })).toBe(1005);
    expect(totalOperacao({ tipo: "venda", quantidade: 100, precoUnitario: 10, taxas: 5 })).toBe(995);
  });
});

describe("apurarTicker: preço médio e vendas comuns", () => {
  const ops = [
    op({ tipo: "compra", data: "2026-01-05", quantidade: 100, precoUnitario: 10, taxas: 5 }),
    op({ tipo: "compra", data: "2026-01-10", quantidade: 100, precoUnitario: 12 }),
    op({ tipo: "venda", data: "2026-02-02", quantidade: 50, precoUnitario: 15, taxas: 2 }),
  ];

  it("as taxas entram no preço médio e a venda baixa o custo pelo preço médio", () => {
    const a = apurarTicker(ops);
    expect(a.quantidade).toBe(150);
    expect(a.custoTotal).toBeCloseTo(2205 - 50 * 11.025, 8);
    expect(a.custoTotal / a.quantidade).toBeCloseTo(11.025, 8); // o preço médio não muda na venda
  });

  it("resultado da venda = líquido − custo baixado", () => {
    const [venda] = apurarTicker(ops).vendas;
    expect(venda.valorBruto).toBe(750);
    expect(venda.valorLiquido).toBe(748);
    expect(venda.custoBaixa).toBe(r2(50 * 11.025));
    expect(venda.resultado).toBe(r2(748 - 551.25));
    expect(venda.dayTrade).toBe(false);
  });

  it("zerar a posição zera o custo (uma nova compra começa outro preço médio)", () => {
    const a = apurarTicker([
      op({ tipo: "compra", data: "2026-01-05", quantidade: 3, precoUnitario: 10 }),
      op({ tipo: "venda", data: "2026-01-06", quantidade: 3, precoUnitario: 11 }),
      op({ tipo: "compra", data: "2026-01-07", quantidade: 2, precoUnitario: 20 }),
    ]);
    expect(a.quantidade).toBe(2);
    expect(a.custoTotal).toBeCloseTo(40, 8);
  });
});

describe("apurarTicker: day trade", () => {
  it("compra e venda no mesmo dia, com data real, são day trade e ficam fora do preço médio", () => {
    const a = apurarTicker([
      op({ tipo: "compra", data: "2026-01-05", quantidade: 100, precoUnitario: 20 }),
      op({ tipo: "compra", data: "2026-03-02", quantidade: 100, precoUnitario: 10 }),
      op({ tipo: "venda", data: "2026-03-02", quantidade: 100, precoUnitario: 11 }),
    ]);
    const [dt] = a.vendas;
    expect(dt.dayTrade).toBe(true);
    expect(dt.resultado).toBe(100);
    expect(a.quantidade).toBe(100);
    expect(a.custoTotal).toBeCloseTo(2000, 8); // a posição antiga segue com o preço médio de 20
  });

  it("o excedente do dia segue como operação comum", () => {
    const a = apurarTicker([
      op({ tipo: "compra", data: "2026-03-02", quantidade: 150, precoUnitario: 10 }),
      op({ tipo: "venda", data: "2026-03-02", quantidade: 100, precoUnitario: 11 }),
    ]);
    expect(a.vendas).toHaveLength(1);
    expect(a.quantidade).toBe(50);
    expect(a.custoTotal).toBeCloseTo(500, 8);
  });

  it("com data estimada (importação da B3) não há day trade", () => {
    const a = apurarTicker([
      op({ tipo: "compra", data: "2026-03-02", quantidade: 100, precoUnitario: 10, dataEstimada: true }),
      op({ tipo: "venda", data: "2026-03-02", quantidade: 100, precoUnitario: 11, dataEstimada: true }),
    ]);
    expect(a.vendas[0].dayTrade).toBe(false);
    expect(a.vendas[0].resultado).toBe(100);
  });
});

describe("apurarTicker: eventos", () => {
  it("desdobramento aumenta a quantidade sem mudar o custo", () => {
    const a = apurarTicker([
      op({ tipo: "compra", data: "2026-01-05", quantidade: 100, precoUnitario: 30 }),
      op({ tipo: "compra", data: "2026-02-01", quantidade: 200, precoUnitario: 0, evento: "desdobramento" }),
    ]);
    expect(a.quantidade).toBe(300);
    expect(a.custoTotal).toBeCloseTo(3000, 8);
  });

  it("grupamento reduz a quantidade, mantém o custo e não conta como venda", () => {
    const a = apurarTicker([
      op({ tipo: "compra", data: "2026-01-05", quantidade: 100, precoUnitario: 1 }),
      op({ tipo: "venda", data: "2026-02-01", quantidade: 90, precoUnitario: 0, evento: "grupamento" }),
    ]);
    expect(a.quantidade).toBe(10);
    expect(a.custoTotal).toBeCloseTo(100, 8);
    expect(a.vendas).toEqual([]);
  });
});

describe("ordenarOperacoes", () => {
  it("no mesmo dia: compras, eventos que aumentam, grupamento e vendas", () => {
    const ordem = ordenarOperacoes([
      op({ id: "v", tipo: "venda", data: "2026-01-05", quantidade: 1, precoUnitario: 1 }),
      op({ id: "g", tipo: "venda", data: "2026-01-05", quantidade: 1, precoUnitario: 0, evento: "grupamento" }),
      op({ id: "b", tipo: "compra", data: "2026-01-05", quantidade: 1, precoUnitario: 0, evento: "bonificacao" }),
      op({ id: "c", tipo: "compra", data: "2026-01-05", quantidade: 1, precoUnitario: 1 }),
      op({ id: "antes", tipo: "venda", data: "2026-01-04", quantidade: 1, precoUnitario: 1 }),
    ]).map((o) => o.id);
    expect(ordem).toEqual(["antes", "c", "b", "g", "v"]);
  });
});

describe("validarSequencia", () => {
  it("aceita comprar e vender no mesmo dia", () => {
    expect(validarSequencia([
      op({ tipo: "venda", data: "2026-01-05", quantidade: 10, precoUnitario: 1 }),
      op({ tipo: "compra", data: "2026-01-05", quantidade: 10, precoUnitario: 1 }),
    ])).toBeNull();
  });

  it("recusa vender mais do que a posição e diz quanto falta", () => {
    expect(validarSequencia([
      op({ tipo: "compra", data: "2026-01-05", quantidade: 10, precoUnitario: 1 }),
      op({ tipo: "venda", data: "2026-01-06", quantidade: 15, precoUnitario: 1 }),
    ])).toEqual({ ticker: "PETR4", data: "2026-01-06", faltam: 5 });
  });
});

describe("calcularPosicoes", () => {
  it("separa por ticker e calcula o preço médio", () => {
    const ps = calcularPosicoes([
      op({ ticker: "VALE3", tipo: "compra", data: "2026-01-05", quantidade: 10, precoUnitario: 60 }),
      op({ ticker: "BBAS3", tipo: "compra", data: "2026-01-05", quantidade: 4, precoUnitario: 25 }),
    ]);
    expect(ps.map((p) => [p.ticker, p.quantidade, p.precoMedio])).toEqual([["BBAS3", 4, 25], ["VALE3", 10, 60]]);
  });
});

describe("calcularEvento", () => {
  it("bonificação de 18,4% sobre 375 ações gera 69 (sem perder uma por ponto flutuante)", () => {
    expect(calcularEvento(375, { tipo: "bonificacao", percentual: 18.4 })).toEqual({ posicaoAntes: 375, posicaoDepois: 444, delta: 69 });
  });

  it("desdobramento 1 para 10", () => {
    expect(calcularEvento(100, { tipo: "desdobramento", antigo: 1, novo: 10 }).delta).toBe(900);
  });

  it("grupamento 10 para 1 arredonda para baixo (a fração é paga em dinheiro)", () => {
    expect(calcularEvento(105, { tipo: "grupamento", antigo: 10, novo: 1 })).toEqual({ posicaoAntes: 105, posicaoDepois: 10, delta: -95 });
  });

  it("recusa parâmetros incoerentes", () => {
    expect(calcularEvento(0, { tipo: "bonificacao", percentual: 10 }).erro).toBeDefined();
    expect(calcularEvento(100, { tipo: "desdobramento", antigo: 10, novo: 1 }).erro).toBeDefined();
    expect(calcularEvento(100, { tipo: "grupamento", antigo: 1, novo: 10 }).erro).toBeDefined();
    expect(calcularEvento(5, { tipo: "grupamento", antigo: 10, novo: 1 }).erro).toBeDefined();
    expect(calcularEvento(5, { tipo: "bonificacao", percentual: 10 }).erro).toBeDefined(); // 0,5 ação
  });

  it("posicaoEm considera as operações até o fim do dia informado", () => {
    const ops = [
      op({ tipo: "compra", data: "2026-01-05", quantidade: 10, precoUnitario: 1 }),
      op({ tipo: "compra", data: "2026-01-06", quantidade: 5, precoUnitario: 1 }),
    ];
    expect(posicaoEm(ops, "PETR4", "2026-01-05")).toBe(10);
    expect(posicaoEm(ops, "PETR4", "2026-01-06")).toBe(15);
    expect(posicaoEm(ops, "VALE3", "2026-01-06")).toBe(0);
  });
});
