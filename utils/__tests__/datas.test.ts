import { describe, expect, it } from "vitest";
import { adicionarMeses } from "@/utils/dateUtils";
import { ehDiaUtilB3, ehDiaUtilBancario } from "@/utils/calendarioB3";
import { diasEntre, somarDias } from "@/utils/aplicacaoSimulacao";

const mais = (data: string, meses: number) =>
  adicionarMeses(new Date(`${data}T00:00:00Z`), meses).toISOString().slice(0, 10);

describe("adicionarMeses", () => {
  it("não transborda o dia em meses curtos", () => {
    expect(mais("2026-01-31", 1)).toBe("2026-02-28");
    expect(mais("2028-01-31", 1)).toBe("2028-02-29");
    expect(mais("2026-03-31", 1)).toBe("2026-04-30");
  });

  it("mantém o dia original nas parcelas seguintes", () => {
    expect(mais("2026-01-31", 2)).toBe("2026-03-31");
    expect(mais("2026-01-31", 3)).toBe("2026-04-30");
  });

  it("vira o ano e aceita meses negativos", () => {
    expect(mais("2026-12-15", 1)).toBe("2027-01-15");
    expect(mais("2026-01-15", 12)).toBe("2027-01-15");
    expect(mais("2026-03-31", -1)).toBe("2026-02-28");
  });
});

describe("calendário da B3", () => {
  it("feriados móveis de 2026: Carnaval, Sexta-feira Santa e Corpus Christi", () => {
    for (const d of ["2026-02-16", "2026-02-17", "2026-04-03", "2026-06-04"]) {
      expect(ehDiaUtilBancario(d)).toBe(false);
    }
    expect(ehDiaUtilBancario("2026-02-18")).toBe(true); // Quarta de Cinzas
  });

  it("Consciência Negra é feriado nacional a partir de 2024", () => {
    expect(ehDiaUtilBancario("2026-11-20")).toBe(false);
    expect(ehDiaUtilBancario("2023-11-20")).toBe(true);
  });

  it("fim de semana não é dia útil", () => {
    expect(ehDiaUtilBancario("2026-11-14")).toBe(false);
    expect(ehDiaUtilBancario("2026-11-15")).toBe(false);
  });

  it("24 e 31/12 não têm pregão, mas os bancos funcionam", () => {
    expect(ehDiaUtilBancario("2026-12-24")).toBe(true);
    expect(ehDiaUtilB3("2026-12-24")).toBe(false);
    expect(ehDiaUtilB3("2026-12-31")).toBe(false);
    expect(ehDiaUtilB3("2026-12-23")).toBe(true);
  });
});

describe("diasEntre e somarDias", () => {
  it("conta dias corridos sem depender de fuso", () => {
    expect(diasEntre("2026-01-01", "2026-12-31")).toBe(364);
    expect(diasEntre("2026-03-01", "2026-02-01")).toBe(0);
  });

  it("soma dias atravessando fevereiro", () => {
    expect(somarDias("2026-02-28", 1)).toBe("2026-03-01");
    expect(somarDias("2028-02-28", 1)).toBe("2028-02-29");
    expect(somarDias("2026-01-01", -1)).toBe("2025-12-31");
  });
});
