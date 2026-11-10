import { describe, expect, it } from "vitest";
import {
  agregarAno,
  compararCategorias,
  competencia,
  rotuloPeriodo,
  type CartaoResumo,
  type TransacaoResumo,
} from "@/utils/resumoAnualUtils";

const cartoes = new Map<number, CartaoResumo>([
  [1, { id: 1, tipo: "credito", diaFechamento: 10 }],
  [2, { id: 2, tipo: "debito", diaFechamento: null }],
]);

let n = 0;
const tx = (t: Partial<TransacaoResumo> & Pick<TransacaoResumo, "tipo" | "valor" | "data">): TransacaoResumo => ({
  id: `t${++n}`,
  descricao: null,
  categoria: "Mercado",
  formaPagamento: "pix",
  cartaoId: null,
  ...t,
});

describe("competencia", () => {
  it("crédito conta no mês da fatura; o resto, no mês da data", () => {
    expect(competencia(tx({ tipo: "saida", valor: 1, data: "2026-03-15", formaPagamento: "cartao", cartaoId: 1 }), cartoes)).toEqual({ ano: 2026, mes: 4 });
    expect(competencia(tx({ tipo: "saida", valor: 1, data: "2026-03-15", formaPagamento: "cartao", cartaoId: 2 }), cartoes)).toEqual({ ano: 2026, mes: 3 });
    expect(competencia(tx({ tipo: "entrada", valor: 1, data: new Date("2026-03-15T00:00:00Z") }), cartoes)).toEqual({ ano: 2026, mes: 3 });
  });

  it("compra depois do fechamento de dezembro entra em janeiro do ano seguinte", () => {
    expect(competencia(tx({ tipo: "saida", valor: 1, data: "2025-12-20", formaPagamento: "cartao", cartaoId: 1 }), cartoes)).toEqual({ ano: 2026, mes: 1 });
  });
});

describe("agregarAno", () => {
  const lista = [
    tx({ tipo: "entrada", valor: 5000, data: "2026-01-05", categoria: "Salário" }),
    tx({ tipo: "saida", valor: 300, data: "2025-12-20", formaPagamento: "cartao", cartaoId: 1, categoria: "Mercado" }), // fatura jan/2026
    tx({ tipo: "saida", valor: 200, data: "2026-01-08", categoria: "Lazer" }),
    tx({ tipo: "saida", valor: 1000, data: "2026-02-03", formaPagamento: "cartao", cartaoId: 1, categoria: "Viagem" }), // fatura fev
    tx({ tipo: "estorno", valor: 400, data: "2026-02-05", formaPagamento: "cartao", cartaoId: 1, categoria: "Viagem" }), // fatura fev
    tx({ tipo: "saida", valor: 999, data: "2026-12-05", formaPagamento: "cartao", cartaoId: 1, categoria: "Mercado" }), // parcela futura (dez)
  ];

  it("compras no crédito entram nas categorias, e o estorno abate a categoria", () => {
    const r = agregarAno(lista, cartoes, 2026);
    expect(r.categorias.find((c) => c.categoria === "Viagem")?.total).toBe(600);
    expect(r.categorias.find((c) => c.categoria === "Mercado")?.total).toBe(300 + 999);
  });

  it("a compra de dezembro do ano anterior conta na fatura de janeiro", () => {
    const r = agregarAno(lista, cartoes, 2026);
    expect(r.meses[0].despesas).toBe(500);
    expect(r.meses[1].despesas).toBe(600);
  });

  it("os percentuais das categorias somam cerca de 100", () => {
    const r = agregarAno(lista, cartoes, 2026);
    const soma = r.categorias.reduce((s, c) => s + c.percentual, 0);
    expect(soma).toBeGreaterThanOrEqual(99);
    expect(soma).toBeLessThanOrEqual(101);
  });

  it("ateMes limita o período (parcela futura fica de fora)", () => {
    const r = agregarAno(lista, cartoes, 2026, 11);
    expect(r.totais.despesas).toBe(1100);
    expect(r.categorias.find((c) => c.categoria === "Mercado")?.total).toBe(300);
  });

  it("forma cartão abatida pelo estorno; maior despesa, média e melhor mês", () => {
    const r = agregarAno(lista, cartoes, 2026, 11);
    expect(r.metodosPagamento.find((m) => m.metodo === "cartao")).toMatchObject({ quantidade: 2, total: 900 });
    expect(r.maiorDespesa?.valor).toBe(1000);
    expect(r.melhorMes).toEqual({ mes: 1, saldo: 4500 });
    expect(r.piorMes).toEqual({ mes: 2, saldo: -600 });
    expect(r.mediaMensal).toEqual({ receitas: 5000, despesas: 550 });
  });

  it("sem categoria vira \"Sem categoria\", como no dashboard", () => {
    const r = agregarAno([tx({ tipo: "saida", valor: 10, data: "2026-01-02", categoria: null })], cartoes, 2026);
    expect(r.categorias[0].categoria).toBe("Sem categoria");
  });
});

describe("compararCategorias e rotuloPeriodo", () => {
  it("variação sobre o mesmo período do ano anterior", () => {
    const r = compararCategorias(
      [{ categoria: "Mercado", total: 1200, percentual: 60 }, { categoria: "Viagem", total: 800, percentual: 40 }],
      [{ categoria: "Mercado", total: 1000, percentual: 100 }],
    );
    expect(r).toEqual([
      { categoria: "Mercado", total: 1200, percentual: 60, totalAnterior: 1000, variacao: 20 },
      { categoria: "Viagem", total: 800, percentual: 40, totalAnterior: 0, variacao: null },
    ]);
  });

  it("rótulo do período", () => {
    expect(rotuloPeriodo(2025, 11)).toBe("jan–nov de 2025");
    expect(rotuloPeriodo(2025, 1)).toBe("jan de 2025");
    expect(rotuloPeriodo(2025, 12)).toBe("2025");
  });
});
