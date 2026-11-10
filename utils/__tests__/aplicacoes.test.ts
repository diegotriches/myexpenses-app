import { describe, expect, it } from "vitest";
import { calcularAliquotaIR } from "@/utils/aplicacaoUtils";
import { simularAplicacao, simularResgateFifo, type LoteEstado } from "@/utils/aplicacaoSimulacao";

describe("calcularAliquotaIR (tabela regressiva)", () => {
  it.each([
    [0, 22.5], [180, 22.5], [181, 20], [360, 20], [361, 17.5], [720, 17.5], [721, 15], [3000, 15],
  ])("%i dias → %d%%", (dias, aliquota) => {
    expect(calcularAliquotaIR(dias)).toBe(aliquota);
  });
});

const taxas = [
  { data: "2026-01-02", taxa: 0.05 },
  { data: "2026-01-05", taxa: 0.05 },
];

describe("simularAplicacao", () => {
  it("por padrão o aporte só rende a partir do dia útil seguinte", () => {
    const r = simularAplicacao({
      percentual: 100, tributacao: "tributavel",
      aportes: [{ id: "a", data: "2026-01-02", valor: 1000 }],
      resgates: [], taxas, ate: "2026-01-05",
    });
    expect(r.valorAtual).toBeCloseTo(1000.5, 8);
    expect(r.principal).toBe(1000);
  });

  it("com 'rende no dia do aporte' também rende a taxa do próprio dia", () => {
    const r = simularAplicacao({
      percentual: 100, tributacao: "tributavel",
      aportes: [{ id: "a", data: "2026-01-02", valor: 1000 }],
      resgates: [], taxas, ate: "2026-01-05", rendeNoDiaAporte: true,
    });
    expect(r.valorAtual).toBeCloseTo(1000 * 1.0005 * 1.0005, 8);
  });

  it("aplica o percentual do indexador (110% do CDI)", () => {
    const r = simularAplicacao({
      percentual: 110, tributacao: "isento",
      aportes: [{ id: "a", data: "2026-01-01", valor: 1000 }],
      resgates: [], taxas: [{ data: "2026-01-02", taxa: 0.05 }], ate: "2026-01-02",
    });
    expect(r.valorAtual).toBeCloseTo(1000.55, 8);
  });

  it("resgate total no dia leva tudo e desconta IR só do rendimento", () => {
    const r = simularAplicacao({
      percentual: 100, tributacao: "tributavel",
      aportes: [{ id: "a", data: "2026-01-02", valor: 1000 }],
      resgates: [{ id: "r", data: "2026-01-05", valorBruto: 0, total: true }],
      taxas, ate: "2026-01-05",
    });
    const [resgate] = r.resgates;
    expect(resgate.bruto).toBeCloseTo(1000.5, 8);
    expect(resgate.impostoRetido).toBeCloseTo(0.5 * 0.225, 8);
    expect(r.valorAtual).toBe(0);
  });

  it("ignora aportes e resgates depois da data de corte", () => {
    const r = simularAplicacao({
      percentual: 100, tributacao: "isento",
      aportes: [{ id: "a", data: "2026-01-02", valor: 1000 }, { id: "b", data: "2026-02-01", valor: 500 }],
      resgates: [], taxas: [], ate: "2026-01-31",
    });
    expect(r.principal).toBe(1000);
  });
});

describe("simularResgateFifo", () => {
  const lotes: LoteEstado[] = [
    { id: "novo", data: "2026-06-01", aportado: 1000, principal: 1000, valorAtual: 1010 },
    { id: "antigo", data: "2025-01-01", aportado: 1000, principal: 1000, valorAtual: 1100 },
  ];

  it("retira primeiro do lote mais antigo, com a alíquota da idade dele", () => {
    const r = simularResgateFifo(lotes, 550, "2026-07-01", "tributavel");
    expect(r.consumo).toHaveLength(1);
    expect(r.consumo[0].loteId).toBe("antigo");
    expect(r.consumo[0].aliquota).toBe(17.5); // 546 dias
    expect(r.consumo[0].rendimento).toBeCloseTo(50, 8); // metade do lote: 550 − 500 de principal
    expect(r.impostoRetido).toBeCloseTo(50 * 0.175, 8);
    expect(r.valorLiquido).toBeCloseTo(550 - 8.75, 8);
  });

  it("não altera os lotes recebidos", () => {
    simularResgateFifo(lotes, 550, "2026-07-01", "tributavel");
    expect(lotes[1].valorAtual).toBe(1100);
  });

  it("valor acima do saldo é limitado e sinalizado", () => {
    const r = simularResgateFifo(lotes, 5000, "2026-07-01", "isento");
    expect(r.bruto).toBeCloseTo(2110, 8);
    expect(r.excedeSaldo).toBe(true);
    expect(r.impostoRetido).toBe(0);
  });
});
