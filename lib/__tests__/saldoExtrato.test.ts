import { describe, expect, it } from "vitest";
import { saldoAposLinha } from "@/lib/saldoExtrato";

describe("saldoAposLinha (saldo do extrato calculado na leitura, pendência 14)", () => {
  it("o saldo de cada linha é o atual menos o que veio depois", () => {
    // linhas: +1000, −200, +50 → acumulados 1000, 800, 850
    expect([1000, 800, 850].map((acc) => saldoAposLinha(850, 850, acc))).toEqual([1000, 800, 850]);
  });

  it("a última linha sempre mostra o saldo atual, mesmo com diferença antiga no extrato", () => {
    expect(saldoAposLinha(900, 850, 850)).toBe(900);
    expect(saldoAposLinha(900, 850, 1000)).toBe(1050);
  });

  it("arredonda ao centavo", () => {
    expect(saldoAposLinha(0.3, 0.1 + 0.2, 0.1)).toBe(0.1);
  });
});
