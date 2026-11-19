import { describe, expect, it } from "vitest";
import {
  indexadoresDoTipo, nomePadraoAplicacao, podeSemVencimento, temFgc, tiposParaIndexador, tributacaoDoTipo,
} from "@/utils/tipoAplicacao";

describe("tributacaoDoTipo", () => {
  it.each([
    ["cdb", "tributavel"], ["rdb", "tributavel"], ["lc", "tributavel"], ["debenture", "tributavel"], ["tesouro", "tributavel"],
    ["lci", "isento"], ["lca", "isento"], ["cri", "isento"], ["cra", "isento"], ["debenture_incentivada", "isento"],
  ] as const)("%s é %s", (tipo, tributacao) => {
    expect(tributacaoDoTipo(tipo)).toBe(tributacao);
  });
});

describe("temFgc", () => {
  it("só CDB, RDB, LC, LCI e LCA têm garantia do FGC", () => {
    expect(["cdb", "rdb", "lc", "lci", "lca"].every((t) => temFgc(t as "cdb"))).toBe(true);
    expect(["cri", "cra", "debenture", "debenture_incentivada", "tesouro"].some((t) => temFgc(t as "cdb"))).toBe(false);
  });
});

describe("indexadores por tipo", () => {
  it("Tesouro tem Selic, Prefixado e IPCA+; os demais, CDI, Prefixado e IPCA+", () => {
    expect(indexadoresDoTipo("tesouro")).toEqual(["selic", "prefixado", "ipca"]);
    expect(indexadoresDoTipo("lci")).toEqual(["cdi", "prefixado", "ipca"]);
  });

  it("para definir o tipo de uma aplicação antiga, oferece só os que combinam com o indexador", () => {
    expect(tiposParaIndexador("selic")).toEqual(["tesouro"]);
    expect(tiposParaIndexador("cdi")).not.toContain("tesouro");
    expect(tiposParaIndexador("cdi")).toHaveLength(9);
    expect(tiposParaIndexador("ipca")).toHaveLength(10);
  });
});

describe("podeSemVencimento", () => {
  it("só CDB, RDB e LC atrelados ao CDI podem ter liquidez diária", () => {
    expect(podeSemVencimento("cdb", "cdi")).toBe(true);
    expect(podeSemVencimento("lc", "cdi")).toBe(true);
    expect(podeSemVencimento("cdb", "prefixado")).toBe(false);
    expect(podeSemVencimento("lci", "cdi")).toBe(false);
    expect(podeSemVencimento("tesouro", "selic")).toBe(false);
  });
});

describe("nomePadraoAplicacao", () => {
  it("monta o nome com o tipo e o indexador", () => {
    expect(nomePadraoAplicacao({ tipo: "cdb", indexador: "cdi" })).toBe("CDB");
    expect(nomePadraoAplicacao({ tipo: "lci", indexador: "ipca" })).toBe("LCI IPCA+");
    expect(nomePadraoAplicacao({ tipo: "cdb", indexador: "prefixado" })).toBe("CDB Prefixado");
    expect(nomePadraoAplicacao({ tipo: "tesouro", indexador: "selic" })).toBe("Tesouro Selic");
    expect(nomePadraoAplicacao({ tipo: "tesouro", indexador: "ipca" })).toBe("Tesouro IPCA+");
  });

  it("sem tipo (aplicação antiga), fica só o indexador", () => {
    expect(nomePadraoAplicacao({ tipo: null, indexador: "cdi" })).toBe("CDI");
    expect(nomePadraoAplicacao({ indexador: "selic" })).toBe("Selic");
  });
});
