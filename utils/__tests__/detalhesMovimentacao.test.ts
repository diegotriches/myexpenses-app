import { describe, expect, it } from "vitest";
import {
  compraDoEstorno,
  estornosDaCompra,
  faturaDaMovimentacao,
  foiAlterada,
  formatarDataHoraBrt,
  resumoParcelamento,
} from "@/utils/detalhesMovimentacao";
import type { Transacao } from "@/types/transacao";

const iso = (d: Date) => d.toISOString().slice(0, 10);

const mov = (p: Partial<Transacao>): Transacao => ({
  id: "x",
  data: "2026-11-10T12:00:00.000Z",
  tipo: "saida",
  valor: "100.00",
  contaId: "conta",
  ...p,
});

describe("resumoParcelamento", () => {
  it("mostra a parcela, quantas faltam e a data da última", () => {
    const r = resumoParcelamento(mov({ parcelado: true, parcelas: 10, parcelaAtual: 3, data: "2026-11-10T12:00:00.000Z" }));
    expect(r).toMatchObject({ atual: 3, total: 10, restantes: 7 });
    expect(iso(r!.ultimaParcela)).toBe("2027-06-10");
  });

  it("na última parcela não falta nenhuma", () => {
    const r = resumoParcelamento(mov({ parcelado: true, parcelas: 4, parcelaAtual: 4 }));
    expect(r?.restantes).toBe(0);
    expect(iso(r!.ultimaParcela)).toBe("2026-11-10");
  });

  it("não transborda o dia em meses curtos", () => {
    const r = resumoParcelamento(mov({ parcelado: true, parcelas: 2, parcelaAtual: 1, data: "2026-01-31T12:00:00.000Z" }));
    expect(iso(r!.ultimaParcela)).toBe("2026-02-28");
  });

  it("à vista ou sem número de parcelas não tem resumo", () => {
    expect(resumoParcelamento(mov({}))).toBeNull();
    expect(resumoParcelamento(mov({ parcelado: true, parcelas: null, parcelaAtual: 1 }))).toBeNull();
  });
});

describe("faturaDaMovimentacao", () => {
  it("compra no crédito usa o dia de fechamento do cartão", () => {
    expect(faturaDaMovimentacao(mov({ formaPagamento: "cartao", data: "2026-11-05T12:00:00.000Z" }), { tipo: "credito", diaFechamento: 10 }))
      .toEqual({ mes: 11, ano: 2026 });
    expect(faturaDaMovimentacao(mov({ formaPagamento: "cartao", data: "2026-12-15T12:00:00.000Z" }), { tipo: "credito", diaFechamento: 10 }))
      .toEqual({ mes: 1, ano: 2027 });
  });

  it("débito, PIX e cartão desconhecido não têm fatura", () => {
    expect(faturaDaMovimentacao(mov({ formaPagamento: "cartao" }), { tipo: "debito", diaFechamento: 10 })).toBeNull();
    expect(faturaDaMovimentacao(mov({ formaPagamento: "pix" }), { tipo: "credito", diaFechamento: 10 })).toBeNull();
    expect(faturaDaMovimentacao(mov({ formaPagamento: "cartao" }), null)).toBeNull();
  });
});

describe("estornos", () => {
  const compra = mov({ id: "compra" });
  const estorno = mov({ id: "e1", tipo: "estorno", estornoDeId: "compra" });
  const outro = mov({ id: "e2", tipo: "estorno", estornoDeId: "outra" });
  const lista = [compra, estorno, outro];

  it("liga a compra aos estornos dela", () => {
    expect(estornosDaCompra("compra", lista).map((t) => t.id)).toEqual(["e1"]);
    expect(compraDoEstorno(estorno, lista)?.id).toBe("compra");
  });

  it("compra de outro mês não é encontrada", () => {
    expect(compraDoEstorno(outro, lista)).toBeNull();
    expect(compraDoEstorno(compra, lista)).toBeNull();
  });
});

describe("foiAlterada", () => {
  it("ignora a diferença de gravação do próprio cadastro", () => {
    expect(foiAlterada("2026-11-10T12:00:00.000Z", "2026-11-10T12:00:00.500Z")).toBe(false);
    expect(foiAlterada("2026-11-10T12:00:00.000Z", "2026-11-11T09:00:00.000Z")).toBe(true);
    expect(foiAlterada(undefined, "2026-11-11T09:00:00.000Z")).toBe(false);
  });
});

describe("formatarDataHoraBrt", () => {
  it("converte para o horário de Brasília", () => {
    expect(formatarDataHoraBrt("2026-11-10T02:30:00.000Z")).toBe("09/11/2026 às 23:30");
  });
});
