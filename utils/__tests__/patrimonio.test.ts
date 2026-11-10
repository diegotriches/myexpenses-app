import { describe, expect, it } from "vitest";
import { custoRendaVariavelEm, mercadoRendaVariavel } from "@/utils/patrimonioUtils";
import type { OperacaoApuravel } from "@/utils/rendaVariavelUtils";

const ops: OperacaoApuravel[] = [
  { id: "1", ticker: "PETR4", tipoAtivo: "acao", tipo: "compra", data: "2026-01-10", quantidade: 100, precoUnitario: 30, taxas: 0 },
  { id: "2", ticker: "HGLG11", tipoAtivo: "fii", tipo: "compra", data: "2026-02-05", quantidade: 10, precoUnitario: 160, taxas: 0 },
  { id: "3", ticker: "PETR4", tipoAtivo: "acao", tipo: "venda", data: "2026-03-20", quantidade: 40, precoUnitario: 35, taxas: 0 },
  { id: "4", ticker: "HGLG11", tipoAtivo: "fii", tipo: "venda", data: "2026-04-15", quantidade: 10, precoUnitario: 170, taxas: 0 },
];

describe("custoRendaVariavelEm", () => {
  it("soma o custo das posições abertas em cada data", () => {
    expect(custoRendaVariavelEm(ops, "2025-12-31")).toBe(0);
    expect(custoRendaVariavelEm(ops, "2026-01-31")).toBe(3000);
    expect(custoRendaVariavelEm(ops, "2026-02-28")).toBe(4600);
  });

  it("a venda baixa o custo pelo preço médio, sem contar o lucro", () => {
    expect(custoRendaVariavelEm(ops, "2026-03-31")).toBe(1800 + 1600);
  });

  it("posição encerrada não entra", () => {
    expect(custoRendaVariavelEm(ops, "2026-04-30")).toBe(1800);
  });

  it("considera as operações do próprio dia", () => {
    expect(custoRendaVariavelEm(ops, "2026-01-10")).toBe(3000);
  });
});

describe("mercadoRendaVariavel", () => {
  it("usa a cotação atual e, sem cotação, o custo", () => {
    const cotacoes = [{ ticker: "PETR4", preco: 40, variacaoDia: null, fonte: "brapi", atualizadoEm: "2026-05-01T21:30:00Z" }];
    expect(mercadoRendaVariavel(ops.slice(0, 2), cotacoes)).toBe(100 * 40 + 1600);
  });
});
