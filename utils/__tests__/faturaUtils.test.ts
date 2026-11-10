import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calcularDataVencimento,
  calcularFaturaDaTransacao,
  calcularPeriodoFatura,
  distribuirValor,
  faturaEstaFechada,
  valorNaFatura,
} from "@/utils/faturaUtils";

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("calcularFaturaDaTransacao", () => {
  it("antes do fechamento fica na fatura do mês; no dia ou depois, na do mês seguinte", () => {
    expect(calcularFaturaDaTransacao("2026-01-05", 10)).toEqual({ mes: 1, ano: 2026 });
    expect(calcularFaturaDaTransacao("2026-01-10", 10)).toEqual({ mes: 2, ano: 2026 });
    expect(calcularFaturaDaTransacao("2026-01-12", 10)).toEqual({ mes: 2, ano: 2026 });
  });

  it("vira o ano em dezembro", () => {
    expect(calcularFaturaDaTransacao("2026-12-15", 10)).toEqual({ mes: 1, ano: 2027 });
  });

  it("fechamento 29 a 31 vale no último dia dos meses curtos", () => {
    expect(calcularFaturaDaTransacao("2026-02-27", 31)).toEqual({ mes: 2, ano: 2026 });
    expect(calcularFaturaDaTransacao("2026-02-28", 31)).toEqual({ mes: 3, ano: 2026 });
    expect(calcularFaturaDaTransacao("2028-02-28", 30)).toEqual({ mes: 2, ano: 2028 });
    expect(calcularFaturaDaTransacao("2028-02-29", 30)).toEqual({ mes: 3, ano: 2028 });
  });

  it("aceita Date à meia-noite UTC, como vem do banco", () => {
    expect(calcularFaturaDaTransacao(new Date("2026-03-09T00:00:00Z"), 10)).toEqual({ mes: 3, ano: 2026 });
  });
});

describe("calcularPeriodoFatura", () => {
  it("vai do fechamento do mês anterior (inclusive) ao fechamento do mês (exclusive)", () => {
    const { inicio, fim } = calcularPeriodoFatura(1, 2026, 10);
    expect(iso(inicio)).toBe("2025-12-10");
    expect(iso(fim)).toBe("2026-01-10");
  });

  it("limita o fechamento ao último dia do mês", () => {
    const { inicio, fim } = calcularPeriodoFatura(3, 2026, 31);
    expect(iso(inicio)).toBe("2026-02-28");
    expect(iso(fim)).toBe("2026-03-31");
  });

  it("toda data cai no período da fatura que calcularFaturaDaTransacao aponta (2025 a 2028, fechamento 1 a 31)", () => {
    const falhas: string[] = [];
    for (let fechamento = 1; fechamento <= 31; fechamento++) {
      for (let t = Date.UTC(2025, 0, 1); t <= Date.UTC(2028, 11, 31); t += 86_400_000) {
        const data = new Date(t);
        const { mes, ano } = calcularFaturaDaTransacao(data, fechamento);
        const { inicio, fim } = calcularPeriodoFatura(mes, ano, fechamento);
        if (data < inicio || data >= fim) falhas.push(`${iso(data)} fechamento ${fechamento}`);
      }
    }
    expect(falhas).toEqual([]);
  });

  it("o início do ciclo pertence à própria fatura (usado ao redatar recorrência e crédito)", () => {
    for (let fechamento = 1; fechamento <= 31; fechamento++) {
      for (let mes = 1; mes <= 12; mes++) {
        const { inicio } = calcularPeriodoFatura(mes, 2026, fechamento);
        expect(calcularFaturaDaTransacao(inicio, fechamento)).toEqual({ mes, ano: 2026 });
      }
    }
  });
});

describe("calcularDataVencimento", () => {
  it("limita o vencimento ao último dia do mês", () => {
    expect(iso(calcularDataVencimento(1, 2026, 15))).toBe("2026-01-15");
    expect(iso(calcularDataVencimento(2, 2026, 31))).toBe("2026-02-28");
    expect(iso(calcularDataVencimento(2, 2028, 31))).toBe("2028-02-29");
  });
});

describe("faturaEstaFechada", () => {
  afterEach(() => vi.useRealTimers());
  const hoje = (isoComHora: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(isoComHora));
  };

  it("fecha no dia do fechamento", () => {
    hoje("2026-01-10T12:00:00-03:00");
    expect(faturaEstaFechada(1, 2026, 10)).toBe(true);
    hoje("2026-01-09T12:00:00-03:00");
    expect(faturaEstaFechada(1, 2026, 10)).toBe(false);
  });

  it("meses passados estão fechados e futuros não", () => {
    hoje("2026-01-20T12:00:00-03:00");
    expect(faturaEstaFechada(12, 2025, 10)).toBe(true);
    expect(faturaEstaFechada(2, 2026, 10)).toBe(false);
  });

  it("com fechamento 31, a fatura de fevereiro fecha em 28/02, quando o ciclo termina", () => {
    hoje("2026-02-28T12:00:00-03:00");
    expect(faturaEstaFechada(2, 2026, 31)).toBe(true);
  });

  it("usa o dia de Brasília: às 22h do dia 9 a fatura que fecha no dia 10 ainda está aberta", () => {
    hoje("2026-01-09T22:00:00-03:00"); // 01h do dia 10 em UTC
    expect(faturaEstaFechada(1, 2026, 10)).toBe(false);
  });
});

describe("distribuirValor", () => {
  it("divide sem perder centavo, com a sobra nas primeiras partes", () => {
    expect(distribuirValor(10000, 3)).toEqual(["33.34", "33.33", "33.33"]);
    expect(distribuirValor(10, 4)).toEqual(["0.03", "0.03", "0.02", "0.02"]);
  });

  it("a soma é sempre o total", () => {
    for (const [total, partes] of [[10000, 7], [99999, 12], [1, 3], [123456, 48]]) {
      const soma = distribuirValor(total, partes).reduce((s, v) => s + Math.round(Number(v) * 100), 0);
      expect(soma).toBe(total);
    }
  });

  it("zero partes devolve lista vazia", () => {
    expect(distribuirValor(100, 0)).toEqual([]);
  });
});

describe("valorNaFatura", () => {
  it("estorno abate o total; os demais somam", () => {
    expect(valorNaFatura({ tipo: "estorno", valor: "50.00" })).toBe(-50);
    expect(valorNaFatura({ tipo: "saida", valor: "50.00" })).toBe(50);
    expect(valorNaFatura({ tipo: "saida", valor: 12.5 })).toBe(12.5);
  });
});
