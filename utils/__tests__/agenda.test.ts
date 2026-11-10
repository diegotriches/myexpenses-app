import { describe, expect, it } from "vitest";
import {
  montarVencimentos,
  projetarFimDoMes,
  proximaOcorrencia,
  type FaturaAgenda,
  type RecorrenciaAgenda,
} from "@/utils/agendaUtils";

const rec = (r: Partial<RecorrenciaAgenda>): RecorrenciaAgenda => ({
  id: "r1",
  descricao: "Aluguel",
  categoria: "Moradia",
  valor: "1500.00",
  tipo: "saida",
  formaPagamento: "pix",
  diaDoMes: 20,
  dataInicio: "2026-01-20",
  ativa: true,
  repeticoesTotal: null,
  repeticoesGeradas: 3,
  ultimaGeracaoMes: 10,
  ultimaGeracaoAno: 2026,
  ...r,
});

const fatura = (f: Partial<FaturaAgenda>): FaturaAgenda => ({
  cartaoId: 1,
  nomeCartao: "Nubank",
  mes: 11,
  ano: 2026,
  total: 800,
  dataVencimento: "2026-11-15",
  ...f,
});

describe("proximaOcorrencia (segue o cron de recorrências)", () => {
  it("no mês atual, quando o dia ainda não chegou", () => {
    expect(proximaOcorrencia(rec({}), "2026-11-10")).toBe("2026-11-20");
  });

  it("no próprio dia, se ainda não foi gerada", () => {
    expect(proximaOcorrencia(rec({}), "2026-11-20")).toBe("2026-11-20");
  });

  it("no mês seguinte, se a deste mês já foi gerada", () => {
    expect(proximaOcorrencia(rec({ ultimaGeracaoMes: 11 }), "2026-11-20")).toBe("2026-12-20");
  });

  it("no mês seguinte, se o dia já passou (o cron só gera no próprio dia)", () => {
    expect(proximaOcorrencia(rec({}), "2026-11-25")).toBe("2026-12-20");
  });

  it("limita o dia ao fim do mês e vira o ano", () => {
    expect(proximaOcorrencia(rec({ diaDoMes: 31, ultimaGeracaoMes: 11 }), "2026-11-30")).toBe("2026-12-31");
    expect(proximaOcorrencia(rec({ diaDoMes: 31, ultimaGeracaoMes: 1, ultimaGeracaoAno: 2027 }), "2027-02-01")).toBe("2027-02-28");
  });

  it("não antes da data de início", () => {
    expect(proximaOcorrencia(rec({ dataInicio: "2027-01-20", ultimaGeracaoMes: null, ultimaGeracaoAno: null }), "2026-11-10")).toBe("2027-01-20");
  });

  it("inativa ou com todas as repetições geradas não tem próxima", () => {
    expect(proximaOcorrencia(rec({ ativa: false }), "2026-11-10")).toBeNull();
    expect(proximaOcorrencia(rec({ repeticoesTotal: 3, repeticoesGeradas: 3 }), "2026-11-10")).toBeNull();
  });
});

describe("montarVencimentos", () => {
  it("junta faturas e recorrências da janela, em ordem de data", () => {
    const itens = montarVencimentos({
      faturas: [fatura({}), fatura({ cartaoId: 2, nomeCartao: "Inter", dataVencimento: "2026-12-10" })],
      recorrencias: [rec({}), rec({ id: "r2", descricao: "Salário", tipo: "entrada", diaDoMes: 5, valor: 5000 })],
      hoje: "2026-11-10",
      dias: 15,
    });
    expect(itens.map((i) => [i.descricao, i.data, i.sentido])).toEqual([
      ["Fatura Nubank", "2026-11-15", "saida"],
      ["Aluguel", "2026-11-20", "saida"],
    ]);
    expect(itens[0].link).toBe("/cartoes/1/fatura?mes=11&ano=2026");
  });

  it("fatura vencida aparece como atrasada; zerada ou com crédito não aparece", () => {
    const itens = montarVencimentos({
      faturas: [fatura({ dataVencimento: "2026-11-05" }), fatura({ cartaoId: 3, total: 0 }), fatura({ cartaoId: 4, total: -50 })],
      recorrencias: [],
      hoje: "2026-11-10",
      dias: 15,
    });
    expect(itens).toHaveLength(1);
    expect(itens[0].atrasada).toBe(true);
  });

  it("no dia do vencimento a fatura ainda não está atrasada", () => {
    const [item] = montarVencimentos({ faturas: [fatura({ dataVencimento: "2026-11-10" })], recorrencias: [], hoje: "2026-11-10", dias: 15 });
    expect(item.atrasada).toBe(false);
  });

  it("recorrência no cartão fica de fora (já entra na fatura)", () => {
    const itens = montarVencimentos({ faturas: [], recorrencias: [rec({ formaPagamento: "cartao" })], hoje: "2026-11-10", dias: 15 });
    expect(itens).toEqual([]);
  });
});

describe("projetarFimDoMes", () => {
  it("saldo atual − faturas do mês + entradas − saídas previstas", () => {
    const p = projetarFimDoMes({
      saldoAtual: 3000,
      faturas: [fatura({}), fatura({ cartaoId: 2, total: 400, dataVencimento: "2026-12-10" })],
      recorrencias: [
        rec({}),
        rec({ id: "r2", tipo: "entrada", diaDoMes: 25, valor: 2000 }),
        rec({ id: "r3", diaDoMes: 5, valor: 99 }), // dia 5 já passou: fica para dezembro
        rec({ id: "r4", formaPagamento: "cartao", diaDoMes: 28, valor: 50 }),
      ],
      hoje: "2026-11-10",
    });
    expect(p).toEqual({
      fimDoMes: "2026-11-30",
      saldoAtual: 3000,
      faturas: 800,
      entradasPrevistas: 2000,
      saidasPrevistas: 1500,
      saldoPrevisto: 2700,
    });
  });

  it("fatura atrasada também sai do saldo previsto", () => {
    const p = projetarFimDoMes({ saldoAtual: 1000, faturas: [fatura({ dataVencimento: "2026-10-15", total: 300 })], recorrencias: [], hoje: "2026-11-10" });
    expect(p.saldoPrevisto).toBe(700);
  });
});
