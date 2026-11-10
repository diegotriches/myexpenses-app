import { describe, expect, it } from "vitest";
import { buildCreateTransacoesFromForm } from "@/lib/buildCreateTransacoesFromForm";
import type { FormMovimentacao } from "@/lib/buildTransacoesFromForm";
import { saldoAposLinha } from "@/lib/saldoExtrato";

const form = (f: Partial<FormMovimentacao>): FormMovimentacao => ({
  contaId: "conta-1",
  tipo: "saida",
  categoria: "Mercado",
  valor: "100.00",
  data: "2026-01-31",
  descricao: "Compra",
  formaPagamento: "cartao",
  cartaoId: "7",
  parcelas: 1,
  repeticoes: 1,
  parcelado: false,
  recorrente: false,
  ...f,
});

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

describe("buildCreateTransacoesFromForm", () => {
  it("à vista gera uma transação", () => {
    const [t] = buildCreateTransacoesFromForm({ form: form({ formaPagamento: "pix" }), contaId: "conta-1" });
    expect(t).toMatchObject({ valor: 100, data: "2026-01-31", contaId: "conta-1", parcelado: false });
  });

  it("no cartão a conta fica vazia e o cartão vai como número", () => {
    const [t] = buildCreateTransacoesFromForm({ form: form({}), contaId: "" });
    expect(t.contaId).toBe("");
    expect(t.cartaoId).toBe(7);
  });

  it("parcelas mensais sem pular fevereiro", () => {
    const ts = buildCreateTransacoesFromForm({ form: form({ parcelado: true, parcelas: 3 }), contaId: "" });
    expect(ts.map((t) => t.data)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("as parcelas, em centavos, somam o total da compra", () => {
    const ts = buildCreateTransacoesFromForm({ form: form({ parcelado: true, parcelas: 3 }), contaId: "" });
    // A API grava cada parcela com 2 casas: 100 em 3 precisa virar 33,34 + 33,33 + 33,33
    const centavos = ts.map((t) => Math.round(Number(t.valor.toFixed(2)) * 100));
    expect(centavos.reduce((s, c) => s + c, 0)).toBe(10000);
  });

  it("exige conta fora do cartão e cartão no cartão", () => {
    expect(() => buildCreateTransacoesFromForm({ form: form({ formaPagamento: "pix" }), contaId: "" })).toThrow();
    expect(() => buildCreateTransacoesFromForm({ form: form({ cartaoId: "" }), contaId: "" })).toThrow();
  });
});
