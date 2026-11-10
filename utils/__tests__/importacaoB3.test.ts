import { describe, expect, it } from "vitest";
import { dataIso, numero, semAcento } from "@/utils/b3ParserUtils";
import { estimarDataNegocio, lerPlanilhaOperacoes } from "@/utils/importacaoOperacoesUtils";
import { chaveProvento, lerPlanilhaProventos, resumirProventos } from "@/utils/proventosUtils";
import { r2 } from "@/utils/rendaVariavelUtils";

describe("leitura de células da B3", () => {
  it("números no formato brasileiro e no formato com ponto decimal", () => {
    expect(numero("1.234,56")).toBe(1234.56);
    expect(numero("1.234")).toBe(1234); // milhar sem vírgula
    expect(numero("10.5")).toBe(10.5);
    expect(numero(12)).toBe(12);
    expect(numero("-")).toBeNull();
    expect(numero("")).toBeNull();
  });

  it("datas dd/mm/aaaa, ISO e Date", () => {
    expect(dataIso("05/03/2026")).toBe("2026-03-05");
    expect(dataIso("2026-03-05T00:00:00")).toBe("2026-03-05");
    expect(dataIso(new Date(2026, 2, 5))).toBe("2026-03-05");
    expect(dataIso("texto")).toBeNull();
  });

  it("compara textos sem acento e sem caixa", () => {
    expect(semAcento("  Movimentação ")).toBe("movimentacao");
  });
});

describe("estimarDataNegocio (D+2 úteis da B3)", () => {
  it("volta dois dias úteis", () => {
    expect(estimarDataNegocio("2026-01-07")).toBe("2026-01-05");
    expect(estimarDataNegocio("2026-01-05")).toBe("2025-12-30"); // pula fim de semana, 01/01 e 31/12
  });

  it("pula o Carnaval", () => {
    expect(estimarDataNegocio("2026-02-19")).toBe("2026-02-13");
  });
});

const CABECALHO = ["Entrada/Saída", "Data", "Movimentação", "Produto", "Instituição", "Quantidade", "Preço unitário", "Valor da Operação"];

describe("lerPlanilhaOperacoes", () => {
  const linhas: unknown[][] = [
    ["Relatório de movimentação"],
    CABECALHO,
    ["Credito", "07/01/2026", "Transferência - Liquidação", "PETR4 - PETROLEO BRASILEIRO S/A", "XP", 300, "4,1152", "1.234,57"],
    ["Debito", "08/01/2026", "Transferência - Liquidação", "VALE3 - VALE S.A.", "XP", 10, "60", "600,00"],
    ["Credito", "09/01/2026", "Desdobro", "BBAS3 - BANCO DO BRASIL", "XP", 100, "-", "-"],
    ["Credito", "10/01/2026", "Rendimento", "HGLG11 - CSHG LOGISTICA", "XP", 10, "1", "10,00"],
    ["Credito", "10/01/2026", "Vencimento", "CDB BANCO X", "XP", 1, "1000", "1.000,00"],
    ["Debito", "12/01/2026", "Grupamento", "MGLU3 - MAGAZINE LUIZA", "XP", 90, "-", "-"],
    ["Credito", "07/01/2026", "Transferência - Liquidação", "PETR4 - PETROLEO BRASILEIRO S/A", "XP", 300, "4,1152", "1.234,57"],
  ];
  const r = lerPlanilhaOperacoes(linhas);

  it("quantidade × preço reproduz o valor da planilha ao centavo (pendência 26)", () => {
    const compra = r.operacoes.find((o) => o.ticker === "PETR4")!;
    expect(compra.tipo).toBe("compra");
    expect(r2(compra.quantidade * compra.precoUnitario)).toBe(1234.57);
  });

  it("crédito é compra e débito é venda, com a data do negócio estimada", () => {
    const venda = r.operacoes.find((o) => o.ticker === "VALE3")!;
    expect(venda.tipo).toBe("venda");
    expect(venda.dataLiquidacao).toBe("2026-01-08");
    expect(venda.data).toBe("2026-01-06");
    expect(venda.dataEstimada).toBe(true);
  });

  it("desdobro entra como evento de preço zero", () => {
    const evento = r.operacoes.find((o) => o.ticker === "BBAS3")!;
    expect(evento.evento).toBe("desdobramento");
    expect(evento.precoUnitario).toBe(0);
  });

  it("proventos e renda fixa ficam de fora; grupamento vira aviso", () => {
    expect(r.operacoes.map((o) => o.ticker)).not.toContain("HGLG11");
    expect(r.ignorados.map((i) => i.motivo)).toEqual(expect.arrayContaining([
      "Proventos (têm importação própria)",
      "Renda fixa (CDB, LCI, Tesouro…)",
    ]));
    expect(r.avisos).toEqual([{ ticker: "MGLU3", data: "2026-01-12", movimentacao: "Grupamento", quantidade: 90 }]);
  });

  it("a mesma linha repetida no arquivo ganha chave própria", () => {
    const chaves = r.operacoes.filter((o) => o.ticker === "PETR4").map((o) => o.chave);
    expect(chaves).toHaveLength(2);
    expect(chaves[1]).toBe(`${chaves[0]}#2`);
  });

  it("sem cabeçalho devolve erro", () => {
    expect(lerPlanilhaOperacoes([["qualquer"], ["coisa"]]).erro).toBeDefined();
  });
});

describe("lerPlanilhaProventos", () => {
  it("lê a planilha 'Proventos Recebidos'", () => {
    const r = lerPlanilhaProventos([
      ["Produto", "Pagamento", "Tipo de Evento", "Instituição", "Quantidade", "Preço unitário", "Valor líquido"],
      ["ITSA4 - ITAUSA S.A.", "01/04/2026", "Juros Sobre Capital Próprio", "XP", 100, "0,02", "1,70"],
      ["HGLG11 - CSHG LOGISTICA", "15/04/2026", "Rendimento", "XP", 10, "1,10", "11,00"],
      ["XPTO - SEM TICKER", "15/04/2026", "Dividendo", "XP", 1, "1", "1,00"],
      ["BBAS3 - BANCO DO BRASIL", "15/04/2026", "Leilão de fração", "XP", 1, "1", "1,00"],
    ]);
    expect(r.formato).toBe("proventos-recebidos");
    expect(r.proventos.map((p) => [p.ticker, p.tipo, p.data, p.valorLiquido])).toEqual([
      ["ITSA4", "jcp", "2026-04-01", 1.7],
      ["HGLG11", "rendimento", "2026-04-15", 11],
    ]);
    expect(r.ignorados).toHaveLength(2);
  });

  it("na 'Movimentação', débito de provento é estorno e fica de fora", () => {
    const r = lerPlanilhaProventos([
      ["Entrada/Saída", "Data", "Movimentação", "Produto", "Quantidade", "Valor da Operação"],
      ["Credito", "10/04/2026", "Dividendo", "BBAS3 - BANCO DO BRASIL", 100, "50,00"],
      ["Debito", "11/04/2026", "Dividendo", "BBAS3 - BANCO DO BRASIL", 100, "50,00"],
    ]);
    expect(r.formato).toBe("movimentacao");
    expect(r.proventos).toHaveLength(1);
    expect(r.ignorados).toEqual([{ motivo: "Provento com débito (estorno)", quantidade: 1 }]);
  });
});

describe("proventos: chave e resumo", () => {
  it("a chave identifica o provento pelo valor arredondado e pela quantidade", () => {
    expect(chaveProvento({ ticker: "BBAS3", data: "2026-04-10", tipo: "dividendo", valorLiquido: 50.004, quantidade: 100 }))
      .toBe("BBAS3|2026-04-10|dividendo|50.00|100");
    expect(chaveProvento({ ticker: "BBAS3", data: "2026-04-10", tipo: "dividendo", valorLiquido: 50, quantidade: null }))
      .toBe("BBAS3|2026-04-10|dividendo|50.00|");
  });

  it("resume 12 meses terminando no mês atual, por tipo e por ticker", () => {
    const r = resumirProventos([
      { ticker: "BBAS3", tipo: "dividendo", data: "2026-04-10", valorLiquido: 50 },
      { ticker: "ITSA4", tipo: "jcp", data: "2025-12-01", valorLiquido: 10 },
      { ticker: "BBAS3", tipo: "dividendo", data: "2024-01-10", valorLiquido: 5 }, // fora dos 12 meses
    ], "2026-04-20");
    expect(r.porMes).toHaveLength(12);
    expect(r.porMes[0].mes).toBe("2025-05");
    expect(r.porMes[11]).toMatchObject({ mes: "2026-04", label: "abr/26", dividendo: 50, total: 50 });
    expect(r.total).toBe(65);
    expect(r.noAno).toBe(50);
    expect(r.ultimos12m).toBe(60);
    expect(r.porTicker.get("BBAS3")).toBe(55);
  });
});
