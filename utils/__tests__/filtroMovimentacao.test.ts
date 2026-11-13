import { describe, expect, it } from "vitest";
import { contarPorTipo, passaFiltroTipo } from "@/utils/filtroMovimentacao";

describe("passaFiltroTipo", () => {
  it("Todas mostra tudo", () => {
    for (const tipo of ["entrada", "saida", "estorno"]) expect(passaFiltroTipo(tipo, "todas")).toBe(true);
  });

  it("Receitas mostra só entradas", () => {
    expect(passaFiltroTipo("entrada", "entrada")).toBe(true);
    expect(passaFiltroTipo("saida", "entrada")).toBe(false);
    expect(passaFiltroTipo("estorno", "entrada")).toBe(false);
  });

  it("Despesas mostra saídas e estornos, que abatem o gasto", () => {
    expect(passaFiltroTipo("saida", "saida")).toBe(true);
    expect(passaFiltroTipo("estorno", "saida")).toBe(true);
    expect(passaFiltroTipo("entrada", "saida")).toBe(false);
  });
});

describe("contarPorTipo", () => {
  it("conta cada opção; o estorno entra em Despesas", () => {
    const lista = [{ tipo: "entrada" }, { tipo: "saida" }, { tipo: "saida" }, { tipo: "estorno" }];
    expect(contarPorTipo(lista)).toEqual({ todas: 4, entrada: 1, saida: 3 });
  });

  it("lista vazia zera tudo", () => {
    expect(contarPorTipo([])).toEqual({ todas: 0, entrada: 0, saida: 0 });
  });
});
