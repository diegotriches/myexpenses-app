import { describe, expect, it } from "vitest";
import { CONFIG_IR_PADRAO, type OperacaoIr } from "@/utils/irRendaVariavelUtils";
import { resumirInvestimentosDoAno, type AplicacaoResumo, type EntradaInvestimentosAno } from "@/utils/resumoInvestimentosUtils";
import { valorAplicacaoEm } from "@/utils/patrimonioUtils";

const aplicacao = (a: Partial<AplicacaoResumo>): AplicacaoResumo => ({
  id: "a1",
  descricao: "CDB Banco X",
  percentualIndexador: "100",
  tributacao: "isento",
  rendeNoDiaAporte: false,
  resgatada: false,
  ultimaTaxa: { data: "2026-11-01", taxa: 0 }, // taxa zero: valores sem rendimento, fáceis de conferir
  aportes: [],
  resgates: [],
  ...a,
});

const op = (o: Partial<OperacaoIr> & Pick<OperacaoIr, "tipo" | "data" | "quantidade" | "precoUnitario">): OperacaoIr => ({
  id: `${o.tipo}-${o.data}`,
  ticker: "PETR4",
  tipoAtivo: "acao",
  taxas: 0,
  evento: null,
  ...o,
});

const base = (e: Partial<EntradaInvestimentosAno>): EntradaInvestimentosAno => ({
  ano: 2025,
  hoje: "2026-11-10",
  contas: [],
  aplicacoes: [],
  operacoes: [],
  cotacoes: [],
  proventos: [],
  configIr: CONFIG_IR_PADRAO,
  darfsPagos: [],
  ...e,
});

describe("valorAplicacaoEm", () => {
  it("é zero antes do primeiro aporte e reconstrói o valor depois", () => {
    const a = aplicacao({ tributacao: "tributavel", ultimaTaxa: { data: "2026-01-01", taxa: 0.05 }, aportes: [{ id: "x", data: "2025-06-02", valor: 1000, principalRestante: 1000, valorAtual: 1000 }] });
    expect(valorAplicacaoEm(a, "2025-06-01")).toEqual({ bruto: 0, liquido: 0 });
    const depois = valorAplicacaoEm(a, "2025-12-31");
    expect(depois.bruto).toBeGreaterThan(1000);
    expect(depois.liquido).toBeLessThan(depois.bruto); // IR sobre o rendimento
  });

  it("desconta os resgates até a data", () => {
    const a = aplicacao({
      aportes: [{ id: "x", data: "2025-02-03", valor: 1000, principalRestante: 0, valorAtual: 0 }],
      resgates: [{ id: "r", data: "2025-08-01", valorBruto: 1000, valorLiquido: 1000, tipo: "total" }],
    });
    expect(valorAplicacaoEm(a, "2025-07-31").bruto).toBe(1000);
    expect(valorAplicacaoEm(a, "2025-08-01").bruto).toBe(0);
  });
});

describe("resumirInvestimentosDoAno", () => {
  it("ano fechado: de 31/12 do ano anterior a 31/12 do ano", () => {
    const r = resumirInvestimentosDoAno(base({}));
    expect([r.inicio, r.fim, r.fimEhHoje]).toEqual(["2024-12-31", "2025-12-31", false]);
    expect(resumirInvestimentosDoAno(base({ ano: 2026 })).fim).toBe("2026-11-10");
  });

  it("renda fixa: rendimento = fim − início − aportes + resgates", () => {
    const r = resumirInvestimentosDoAno(base({
      aplicacoes: [aplicacao({
        aportes: [
          { id: "x", data: "2024-05-02", valor: 2000, principalRestante: 1500, valorAtual: 1500 },
          { id: "y", data: "2025-03-03", valor: 1000, principalRestante: 1000, valorAtual: 1000 },
        ],
        resgates: [{ id: "r", data: "2025-09-01", valorBruto: 500, valorLiquido: 500, tipo: "parcial" }],
      })],
    }));
    expect(r.rendaFixa).toEqual({ inicio: 2000, fim: 2500, aportes: 1000, resgates: 500, rendimento: 0 });
    expect(r.declaracao.aplicacoes).toEqual([{ descricao: "CDB Banco X", bruto: 2500 }]);
  });

  it("contas: patrimônio só com as ativas; declaração com todas as que têm saldo", () => {
    const r = resumirInvestimentosDoAno(base({
      contas: [
        { id: "c1", nome: "Nubank", ativo: true, saldoInicio: 1000, saldoFim: 3000 },
        { id: "c2", nome: "Antiga", ativo: false, saldoInicio: 50, saldoFim: 50 },
        { id: "c3", nome: "Zerada", ativo: true, saldoInicio: 10, saldoFim: 0 },
      ],
    }));
    expect(r.patrimonio.inicio.contas).toBe(1010);
    expect(r.patrimonio.fim.contas).toBe(3000);
    expect(r.declaracao.contas).toEqual([{ nome: "Nubank", saldo: 3000 }, { nome: "Antiga", saldo: 50 }]);
  });

  it("renda variável: custo no início e no fim, resultado realizado e bens em 31/12", () => {
    const r = resumirInvestimentosDoAno(base({
      operacoes: [
        op({ tipo: "compra", data: "2024-06-10", quantidade: 100, precoUnitario: 20 }),
        op({ tipo: "compra", data: "2025-02-10", quantidade: 100, precoUnitario: 30 }),
        op({ tipo: "venda", data: "2025-05-10", quantidade: 50, precoUnitario: 40 }),
      ],
    }));
    expect(r.rendaVariavel.custoInicio).toBe(2000);
    expect(r.rendaVariavel.valorFim).toBe(5000 - 50 * 25);
    expect(r.rendaVariavel.resultadoRealizado).toBe(50 * 40 - 50 * 25);
    expect(r.rendaVariavel.ganhoIsento).toBe(750); // vendas de ações abaixo de R$ 20 mil no mês
    expect(r.declaracao.rendaVariavel).toEqual([{ ticker: "PETR4", tipoAtivo: "acao", quantidade: 150, custoTotal: 3750 }]);
  });

  it("proventos do ano por tipo e DARFs com a situação de pagamento", () => {
    const r = resumirInvestimentosDoAno(base({
      proventos: [
        { ticker: "BBAS3", tipo: "dividendo", data: "2025-03-10", valorLiquido: 100 },
        { ticker: "HGLG11", tipo: "rendimento", data: "2025-04-15", valorLiquido: 50 },
        { ticker: "ITSA4", tipo: "jcp", data: "2025-06-01", valorLiquido: 30 },
        { ticker: "BBAS3", tipo: "dividendo", data: "2024-12-10", valorLiquido: 999 },
      ],
      operacoes: [
        op({ tipo: "compra", data: "2025-01-10", quantidade: 1000, precoUnitario: 30 }),
        op({ tipo: "venda", data: "2025-02-10", quantidade: 1000, precoUnitario: 31 }), // R$ 31 mil: tributável
      ],
      darfsPagos: ["2025-02"],
    }));
    expect(r.proventos).toEqual({ dividendos: 100, rendimentos: 50, jcp: 30, total: 180 });
    expect(r.declaracao.isentos).toEqual({ dividendos: 100, rendimentosFii: 50, ganhoIsentoAcoes: 0 });
    expect(r.declaracao.exclusivos).toEqual({ jcp: 30 });
    expect(r.darfs).toEqual([{ competencia: "2025-02", valor: 150, vencimento: "2025-03-31", pago: true }]);
    expect(r.rendaVariavel.impostoApurado).toBe(150);
  });
});
