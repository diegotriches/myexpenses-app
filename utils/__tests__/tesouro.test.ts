import { describe, expect, it } from "vitest";
import {
  descreverRentabilidade, mesReferenciaIpca, somarMes, taxasDiariasTesouro,
} from "@/utils/tesouroUtils";
import { simularAplicacao } from "@/utils/aplicacaoSimulacao";

/** Dias de segunda a sexta entre duas datas (inclusive) */
function diasUteis(ini: string, fim: string, feriados: string[] = []): string[] {
  const r: string[] = [];
  for (let d = new Date(`${ini}T00:00:00Z`); d <= new Date(`${fim}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const s = d.getUTCDay();
    const iso = d.toISOString().slice(0, 10);
    if (s !== 0 && s !== 6 && !feriados.includes(iso)) r.push(iso);
  }
  return r;
}

/** Fator acumulado das taxas diárias */
const acumulado = (taxas: { taxa: number }[]) => taxas.reduce((f, t) => f * (1 + t.taxa / 100), 1);

describe("descreverRentabilidade", () => {
  it("mostra a rentabilidade de cada indexador", () => {
    expect(descreverRentabilidade({ indexador: "cdi", percentualIndexador: "120.00" })).toBe("120% do CDI");
    expect(descreverRentabilidade({ indexador: "selic", percentualIndexador: "100" })).toBe("100% do Selic");
    expect(descreverRentabilidade({ indexador: "prefixado", percentualIndexador: "100", taxaAnual: "13.5000" })).toBe("Prefixado 13,5% a.a.");
    expect(descreverRentabilidade({ indexador: "ipca", percentualIndexador: "100", taxaAnual: "6.2" })).toBe("IPCA + 6,2% a.a.");
  });
});

describe("datas do IPCA", () => {
  it("do dia 15 de M ao dia 14 de M+1 vale o IPCA de M", () => {
    expect(mesReferenciaIpca("2026-03-15")).toBe("2026-03");
    expect(mesReferenciaIpca("2026-04-14")).toBe("2026-03");
    expect(mesReferenciaIpca("2026-01-10")).toBe("2025-12");
  });

  it("soma meses atravessando o ano", () => {
    expect(somarMes("2025-12", 1)).toBe("2026-01");
    expect(somarMes("2026-01", -1)).toBe("2025-12");
  });
});

describe("taxasDiariasTesouro: prefixado", () => {
  it("252 dias úteis rendem exatamente a taxa anual", () => {
    const dias = diasUteis("2026-01-01", "2027-12-31").slice(0, 252);
    const { taxas, mesesIpcaEstimados } = taxasDiariasTesouro({ indexador: "prefixado", taxaAnual: 12, diasUteis: dias });
    expect(taxas).toHaveLength(252);
    expect(acumulado(taxas)).toBeCloseTo(1.12, 10);
    expect(mesesIpcaEstimados).toEqual([]);
  });

  it("no motor de renda fixa, R$ 1.000 a 10% a.a. viram R$ 1.100 em 252 dias úteis", () => {
    const dias = diasUteis("2026-01-02", "2027-12-31").slice(0, 253); // 1º dia = aporte, rende do seguinte
    const { taxas } = taxasDiariasTesouro({ indexador: "prefixado", taxaAnual: 10, diasUteis: dias });
    const r = simularAplicacao({
      percentual: 100,
      tributacao: "tributavel",
      aportes: [{ id: "a", data: dias[0], valor: 1000 }],
      resgates: [],
      taxas,
      ate: dias[252],
    });
    expect(r.valorAtual).toBeCloseTo(1100, 6);
  });
});

describe("taxasDiariasTesouro: IPCA+", () => {
  it("um período completo acumula a taxa real proporcional e o IPCA inteiro do mês", () => {
    // período do IPCA de março/2026: 15/03 a 14/04, com um feriado no meio
    const dias = diasUteis("2026-03-15", "2026-04-14", ["2026-04-03"]);
    const { taxas, mesesIpcaEstimados } = taxasDiariasTesouro({
      indexador: "ipca", taxaAnual: 6, diasUteis: dias, ipcaMensal: { "2026-03": 0.5 },
    });
    const real = Math.pow(1.06, dias.length / 252);
    expect(acumulado(taxas)).toBeCloseTo(real * 1.005, 10);
    expect(mesesIpcaEstimados).toEqual([]);
  });

  it("usa o IPCA certo de cada lado do dia 15", () => {
    const dias = ["2026-05-14", "2026-05-15"];
    const { taxas } = taxasDiariasTesouro({
      indexador: "ipca", taxaAnual: 0, diasUteis: dias, ipcaMensal: { "2026-04": 1, "2026-05": 0 },
    });
    expect(taxas[0].taxa).toBeGreaterThan(0); // 14/05 corre o IPCA de abril
    expect(taxas[1].taxa).toBe(0);            // 15/05 corre o IPCA de maio
  });

  it("mês sem IPCA publicado repete o último e fica marcado como estimado", () => {
    const dias = diasUteis("2026-10-15", "2026-11-17");
    const { taxas, mesesIpcaEstimados } = taxasDiariasTesouro({
      indexador: "ipca", taxaAnual: 0, diasUteis: dias, ipcaMensal: { "2026-09": 0.4 },
    });
    expect(mesesIpcaEstimados).toEqual(["2026-10", "2026-11"]); // 16 e 17/11 já correm o IPCA de novembro
    // o período de outubro (15/10 a 14/11) já passou inteiro: corre todo o IPCA repetido
    const ateAgora = acumulado(taxas.filter((t) => t.data < "2026-11-15"));
    expect(ateAgora).toBeCloseTo(1.004, 10);
    expect(taxas.at(-1)!.taxa).toBeGreaterThan(0);
  });

  it("período ainda em curso conta os dias úteis futuros, sem passar do IPCA do mês", () => {
    const dias = diasUteis("2026-11-16", "2026-11-17");
    const { taxas } = taxasDiariasTesouro({
      indexador: "ipca", taxaAnual: 0, diasUteis: dias, ipcaMensal: { "2026-11": 0.4 },
    });
    // período 15/11 a 14/12: 21 dias de semana (14/12 é segunda); 2 já correram
    expect(acumulado(taxas)).toBeCloseTo(Math.pow(1.004, 2 / 21), 10);
  });
});
