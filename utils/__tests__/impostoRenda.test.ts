import { describe, expect, it } from "vitest";
import { apurarMeses, CONFIG_IR_PADRAO, vencimentoDarf, type VendaIr } from "@/utils/irRendaVariavelUtils";

const venda = (v: Partial<VendaIr> & Pick<VendaIr, "data" | "valorBruto" | "resultado">): VendaIr => ({
  ticker: "PETR4",
  tipoAtivo: "acao",
  quantidade: 100,
  dayTrade: false,
  estimada: false,
  ...v,
});

describe("vencimentoDarf (último dia útil bancário do mês seguinte)", () => {
  it.each([
    ["2026-01", "2026-02-27"], // 28/02/2026 é sábado
    ["2024-01", "2024-02-29"], // ano bissexto
    ["2024-02", "2024-03-28"], // 29/03/2024 é Sexta-feira Santa
    ["2028-01", "2028-02-25"], // 28 e 29/02/2028 são Carnaval
    ["2029-02", "2029-03-29"], // 30/03/2029 é Sexta-feira Santa
    ["2029-04", "2029-05-30"], // 31/05/2029 é Corpus Christi
    ["2026-12", "2027-01-29"], // vira o ano
  ])("competência %s vence em %s", (competencia, vencimento) => {
    expect(vencimentoDarf(competencia)).toBe(vencimento);
  });
});

describe("apurarMeses", () => {
  it("ações: vendas de até R$ 20 mil no mês deixam o ganho isento", () => {
    const [mes] = apurarMeses([venda({ data: "2026-03-10", valorBruto: 20000, resultado: 1000 })], CONFIG_IR_PADRAO);
    expect(mes.acaoIsenta).toBe(true);
    expect(mes.ganhoIsento).toBe(1000);
    expect(mes.imposto.total).toBe(0);
    expect(mes.darf).toBeNull();
  });

  it("ações: acima de R$ 20 mil o ganho paga 15% e gera DARF", () => {
    const [mes] = apurarMeses([venda({ data: "2026-03-10", valorBruto: 20000.01, resultado: 1000 })], CONFIG_IR_PADRAO);
    expect(mes.acaoIsenta).toBe(false);
    expect(mes.imposto.comum).toBe(150);
    expect(mes.darf).toEqual({ valor: 150, vencimento: "2026-04-30", codigo: "6015", acumuladoAnterior: 0 });
  });

  it("prejuízo acumula e é compensado no mês tributável seguinte", () => {
    const meses = apurarMeses([
      venda({ data: "2026-03-10", valorBruto: 5000, resultado: -400 }),
      venda({ data: "2026-04-10", valorBruto: 30000, resultado: 1000 }),
    ], CONFIG_IR_PADRAO);
    expect(meses[0].prejuizoFinal.comum).toBe(400);
    expect(meses[1].compensado.comum).toBe(400);
    expect(meses[1].base.comum).toBe(600);
    expect(meses[1].imposto.comum).toBe(90);
    expect(meses[1].prejuizoFinal.comum).toBe(0);
  });

  it("ganho isento não consome o prejuízo acumulado", () => {
    const meses = apurarMeses([
      venda({ data: "2026-03-10", valorBruto: 5000, resultado: -400 }),
      venda({ data: "2026-04-10", valorBruto: 10000, resultado: 1000 }),
    ], CONFIG_IR_PADRAO);
    expect(meses[1].acaoIsenta).toBe(true);
    expect(meses[1].prejuizoFinal.comum).toBe(400);
  });

  it("FII e day trade pagam 20%, cada um com o seu prejuízo", () => {
    const [mes] = apurarMeses([
      venda({ ticker: "HGLG11", tipoAtivo: "fii", data: "2026-03-10", valorBruto: 1000, resultado: 100 }),
      venda({ data: "2026-03-11", valorBruto: 1000, resultado: 200, dayTrade: true }),
      venda({ ticker: "IVVB11", tipoAtivo: "etf", data: "2026-03-12", valorBruto: 1000, resultado: -50 }),
    ], CONFIG_IR_PADRAO);
    expect(mes.imposto.fii).toBe(20);
    expect(mes.imposto.day).toBe(40);
    expect(mes.imposto.comum).toBe(0);
    expect(mes.prejuizoFinal.comum).toBe(50);
  });

  it("day trade não tem isenção nem entra no limite de R$ 20 mil", () => {
    const [mes] = apurarMeses([venda({ data: "2026-03-11", valorBruto: 50000, resultado: 100, dayTrade: true })], CONFIG_IR_PADRAO);
    expect(mes.vendasAcoes).toBe(0);
    expect(mes.imposto.day).toBe(20);
  });

  it("imposto abaixo de R$ 10 fica pendente e soma no mês seguinte", () => {
    const meses = apurarMeses([
      venda({ data: "2026-03-10", valorBruto: 30000, resultado: 40 }), // 6,00
      venda({ data: "2026-04-10", valorBruto: 30000, resultado: 40 }), // 6,00
    ], CONFIG_IR_PADRAO);
    expect(meses[0].darf).toBeNull();
    expect(meses[0].impostoPendente).toBe(6);
    expect(meses[1].darf).toEqual({ valor: 12, vencimento: "2026-05-29", codigo: "6015", acumuladoAnterior: 6 });
    expect(meses[1].impostoPendente).toBe(0);
  });

  it("usa o prejuízo inicial informado na configuração", () => {
    const [mes] = apurarMeses(
      [venda({ data: "2026-03-10", valorBruto: 30000, resultado: 1000 })],
      { ...CONFIG_IR_PADRAO, prejuizoInicialComum: 1000 },
    );
    expect(mes.imposto.total).toBe(0);
    expect(mes.prejuizoFinal.comum).toBe(0);
  });
});
