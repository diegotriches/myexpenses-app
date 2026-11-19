import { describe, expect, it } from "vitest";
import {
  contarPorTipo, filtrarRendaFixa, filtrarRendaVariavel, filtrosAtivosRendaFixa, filtrosAtivosRendaVariavel,
  FILTRO_RENDA_FIXA_PADRAO, FILTRO_RENDA_VARIAVEL_PADRAO, normalizarBusca, type ItemRendaFixa, type ItemRendaVariavel,
} from "@/utils/filtroInvestimentos";
import { familiaDoTipo, nomeCompletoAplicacao } from "@/utils/tipoAplicacao";

const HOJE = "2026-11-19";
const rf = (id: string, extra: Partial<ItemRendaFixa>): ItemRendaFixa => ({
  id, nome: id, textosBusca: [], tipo: "cdb", indexador: "cdi", contaId: "c1", vencimento: null, valor: 1000, rendimento: 50, ...extra,
});
const itensRf = [
  rf("Reserva", { textosBusca: ["110% do CDI", "CDB", "Nubank"], valor: 12000, rendimento: 900 }),
  rf("LCI Inter", { tipo: "lci", textosBusca: ["Letra de Crédito Imobiliário"], vencimento: "2027-06-10", valor: 5000, rendimento: 300 }),
  rf("Tesouro IPCA", { tipo: "tesouro", indexador: "ipca", contaId: "c2", vencimento: "2035-05-15", valor: 8000, rendimento: 1200 }),
  rf("Antiga", { tipo: "sem_tipo", vencimento: "2026-12-20", valor: 2000, rendimento: 10 }),
];
const nomes = (l: { id: string }[]) => l.map((i) => i.id);

describe("normalizarBusca", () => {
  it("ignora acentos e maiúsculas", () => {
    expect(normalizarBusca("  Crédito IMOBILIÁRIO ")).toBe("credito imobiliario");
  });
});

describe("filtrarRendaFixa", () => {
  it("sem filtro mostra tudo, do maior valor para o menor", () => {
    expect(nomes(filtrarRendaFixa(itensRf, FILTRO_RENDA_FIXA_PADRAO, HOJE))).toEqual(["Reserva", "Tesouro IPCA", "LCI Inter", "Antiga"]);
  });

  it("busca em qualquer texto do item, sem acento e com várias palavras", () => {
    expect(nomes(filtrarRendaFixa(itensRf, { ...FILTRO_RENDA_FIXA_PADRAO, busca: "credito imob" }, HOJE))).toEqual(["LCI Inter"]);
    expect(nomes(filtrarRendaFixa(itensRf, { ...FILTRO_RENDA_FIXA_PADRAO, busca: "nubank 110" }, HOJE))).toEqual(["Reserva"]);
  });

  it("filtra por tipos (inclusive sem tipo), indexador e conta", () => {
    expect(nomes(filtrarRendaFixa(itensRf, { ...FILTRO_RENDA_FIXA_PADRAO, tipos: ["lci", "sem_tipo"] }, HOJE))).toEqual(["LCI Inter", "Antiga"]);
    expect(nomes(filtrarRendaFixa(itensRf, { ...FILTRO_RENDA_FIXA_PADRAO, indexadores: ["ipca"] }, HOJE))).toEqual(["Tesouro IPCA"]);
    expect(nomes(filtrarRendaFixa(itensRf, { ...FILTRO_RENDA_FIXA_PADRAO, contaId: "c2" }, HOJE))).toEqual(["Tesouro IPCA"]);
  });

  it("filtra pelo prazo até o vencimento", () => {
    const venc = (v: "liquidez" | "ate90" | "ate365" | "mais365") =>
      nomes(filtrarRendaFixa(itensRf, { ...FILTRO_RENDA_FIXA_PADRAO, vencimento: v, ordem: "nome" }, HOJE));
    expect(venc("liquidez")).toEqual(["Reserva"]);
    expect(venc("ate90")).toEqual(["Antiga"]);
    expect(venc("ate365")).toEqual(["Antiga", "LCI Inter"]);
    expect(venc("mais365")).toEqual(["Tesouro IPCA"]);
  });

  it("ordena por rendimento, vencimento (liquidez diária por último) e nome", () => {
    expect(nomes(filtrarRendaFixa(itensRf, { ...FILTRO_RENDA_FIXA_PADRAO, ordem: "rendimento" }, HOJE))).toEqual(["Tesouro IPCA", "Reserva", "LCI Inter", "Antiga"]);
    expect(nomes(filtrarRendaFixa(itensRf, { ...FILTRO_RENDA_FIXA_PADRAO, ordem: "vencimento" }, HOJE))).toEqual(["Antiga", "LCI Inter", "Tesouro IPCA", "Reserva"]);
    expect(nomes(filtrarRendaFixa(itensRf, { ...FILTRO_RENDA_FIXA_PADRAO, ordem: "nome" }, HOJE))).toEqual(["Antiga", "LCI Inter", "Reserva", "Tesouro IPCA"]);
  });

  it("conta os filtros ligados, sem contar a ordem", () => {
    expect(filtrosAtivosRendaFixa({ ...FILTRO_RENDA_FIXA_PADRAO, ordem: "nome" })).toBe(0);
    expect(filtrosAtivosRendaFixa({ ...FILTRO_RENDA_FIXA_PADRAO, busca: "x", tipos: ["cdb"], vencimento: "ate90" })).toBe(3);
  });
});

describe("filtrarRendaVariavel", () => {
  const rv = (ticker: string, tipo: string, valor: number, resultado: number): ItemRendaVariavel => ({ ticker, tipo, valor, resultado });
  const itens = [rv("ITSA4", "acao", 3000, 400), rv("MXRF11", "fii", 5000, -120), rv("BOVA11", "etf", 1000, 0), rv("WEGE3", "acao", 2000, -50)];
  const tickers = (l: ItemRendaVariavel[]) => l.map((i) => i.ticker);

  it("busca pelo ticker, filtra por tipo e ordena por valor", () => {
    expect(tickers(filtrarRendaVariavel(itens, { ...FILTRO_RENDA_VARIAVEL_PADRAO, busca: "itsa" }))).toEqual(["ITSA4"]);
    expect(tickers(filtrarRendaVariavel(itens, { ...FILTRO_RENDA_VARIAVEL_PADRAO, tipos: ["acao"] }))).toEqual(["ITSA4", "WEGE3"]);
    expect(tickers(filtrarRendaVariavel(itens, FILTRO_RENDA_VARIAVEL_PADRAO))).toEqual(["MXRF11", "ITSA4", "WEGE3", "BOVA11"]);
  });

  it("separa lucro e prejuízo (resultado zero não entra em nenhum)", () => {
    expect(tickers(filtrarRendaVariavel(itens, { ...FILTRO_RENDA_VARIAVEL_PADRAO, resultado: "lucro" }))).toEqual(["ITSA4"]);
    expect(tickers(filtrarRendaVariavel(itens, { ...FILTRO_RENDA_VARIAVEL_PADRAO, resultado: "prejuizo", ordem: "resultado" }))).toEqual(["WEGE3", "MXRF11"]);
  });

  it("conta os filtros ligados e os itens por tipo", () => {
    expect(filtrosAtivosRendaVariavel({ ...FILTRO_RENDA_VARIAVEL_PADRAO, resultado: "lucro", ordem: "ticker" })).toBe(1);
    expect(contarPorTipo(itens).get("acao")).toBe(2);
  });
});

describe("etiqueta e nome da aplicação", () => {
  it("agrupa os tipos em famílias para a cor", () => {
    expect(familiaDoTipo("cdb")).toBe("bancario");
    expect(familiaDoTipo("lca")).toBe("isento_fgc");
    expect(familiaDoTipo("debenture_incentivada")).toBe("credito_privado");
    expect(familiaDoTipo("tesouro")).toBe("tesouro");
  });

  it("nome completo: descrição ou tipo com a rentabilidade", () => {
    expect(nomeCompletoAplicacao({ descricao: "Reserva", tipo: "cdb", indexador: "cdi", percentualIndexador: "110" })).toBe("Reserva");
    expect(nomeCompletoAplicacao({ tipo: "cdb", indexador: "cdi", percentualIndexador: "110.00" })).toBe("CDB 110% do CDI");
    expect(nomeCompletoAplicacao({ tipo: "tesouro", indexador: "ipca", percentualIndexador: "100", taxaAnual: "6.2" })).toBe("Tesouro IPCA + 6,2% a.a.");
    expect(nomeCompletoAplicacao({ tipo: null, indexador: "selic", percentualIndexador: "100" })).toBe("100% do Selic");
  });
});
