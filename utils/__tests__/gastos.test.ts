import { describe, expect, it } from "vitest";
import { compararCategoriasComMedia, taxaDePoupanca, type GastoParaComparar } from "@/utils/gastosUtils";
import { resumirRendaFixa, type AplicacaoParaPatrimonio } from "@/utils/patrimonioUtils";

const g = (data: string, categoria: string, valor: number, tipo = "saida"): GastoParaComparar => ({ data, categoria, valor, tipo });

describe("compararCategoriasComMedia", () => {
  const historico = [
    g("2026-08-10", "Mercado", 1000),
    g("2026-09-10", "Mercado", 800),
    g("2026-10-10", "Mercado", 1200),
    g("2026-10-15", "Lazer", 300),
    g("2026-11-05", "Mercado", 1500),
    g("2026-11-06", "Lazer", 150),
    g("2026-11-07", "Viagem", 2000),
    g("2026-11-08", "Salário", 5000, "entrada"),
  ];

  it("compara o mês atual com a média dos meses desde o primeiro gasto", () => {
    const r = compararCategoriasComMedia(historico, "2026-11-20");
    expect(r.mesesConsiderados).toBe(3); // ago, set e out: antes de agosto não havia gasto
    expect(r.itens.find((i) => i.categoria === "Mercado")).toEqual({ categoria: "Mercado", atual: 1500, media: 1000, percentual: 150 });
    expect(r.itens.find((i) => i.categoria === "Lazer")).toEqual({ categoria: "Lazer", atual: 150, media: 100, percentual: 150 });
  });

  it("categoria sem histórico vem por último, sem percentual", () => {
    const r = compararCategoriasComMedia(historico, "2026-11-20");
    expect(r.itens[r.itens.length - 1]).toEqual({ categoria: "Viagem", atual: 2000, media: 0, percentual: null });
  });

  it("receitas não entram e estorno abate a categoria", () => {
    const r = compararCategoriasComMedia([...historico, g("2026-11-09", "Mercado", 500, "estorno")], "2026-11-20");
    expect(r.itens.map((i) => i.categoria)).not.toContain("Salário");
    expect(r.itens.find((i) => i.categoria === "Mercado")?.atual).toBe(1000);
  });

  it("vira o ano ao buscar os meses anteriores", () => {
    const r = compararCategoriasComMedia([g("2025-12-10", "Mercado", 600), g("2026-01-10", "Mercado", 300)], "2026-01-15");
    expect(r.mesesConsiderados).toBe(1);
    expect(r.itens[0].percentual).toBe(50);
  });

  it("sem histórico nenhum, não há meses de comparação", () => {
    const r = compararCategoriasComMedia([g("2026-11-05", "Mercado", 100)], "2026-11-20");
    expect(r.mesesConsiderados).toBe(0);
    expect(r.itens[0].percentual).toBeNull();
  });
});

describe("taxaDePoupanca", () => {
  it("quanto da receita sobrou", () => {
    expect(taxaDePoupanca(5000, 4000)).toBe(20);
    expect(taxaDePoupanca(5000, 6000)).toBe(-20);
    expect(taxaDePoupanca(0, 100)).toBeNull();
  });
});

describe("resumirRendaFixa", () => {
  it("soma o principal e o líquido só das aplicações ativas", () => {
    const aplicacao = (resgatada: boolean, principal: number, valorAtual: number): AplicacaoParaPatrimonio => ({
      percentualIndexador: "100",
      tributacao: "isento",
      rendeNoDiaAporte: false,
      resgatada,
      ultimaTaxa: null,
      aportes: [{ id: "a", data: "2026-01-02", valor: principal, principalRestante: principal, valorAtual }],
    });
    expect(resumirRendaFixa([aplicacao(false, 1000, 1100), aplicacao(true, 500, 520)], "2026-11-10")).toEqual({
      quantidade: 1,
      principal: 1000,
      liquido: 1100,
      rendimentoLiquido: 100,
    });
  });
});
