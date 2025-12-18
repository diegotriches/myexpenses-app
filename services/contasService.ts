import { db } from "@/db";
import { contas, transacoes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

interface CriarContaInput {
  nome: string;
  tipo: "BANCARIA" | "CARTAO";
  ativo?: boolean;
  saldoInicial: number;
  saldoAtual?: number;
  observacoes?: string | null;
  banco?: string | null;
  bandeira?: string | null;
  ultimosDigitos?: string | null;
  limite?: number | null;
  fechamentoFatura?: number | null;
  vencimentoFatura?: number | null;
}

type AtualizarContaInput = Partial<CriarContaInput>;

export class ContasService {
  /* LISTAR */
  static async listar() {
    const result = await db.select().from(contas);

    return result.map((c) => ({
      ...c,
      saldoInicial: Number(c.saldoInicial),
      saldoAtual: Number(c.saldoAtual),
      limite: c.limite !== null ? Number(c.limite) : null,
      fechamentoFatura: c.fechamentoFatura,
      vencimentoFatura: c.vencimentoFatura,
    }));
  }

  /* CRIAR */
  static async criar(data: CriarContaInput) {
    const saldoInicial = data.saldoInicial ?? 0;

    return await db.transaction(async (tx) => {
      const [conta] = await tx
        .insert(contas)
        .values({
          nome: data.nome,
          tipo: data.tipo,
          ativo: data.ativo ?? true,

          saldoInicial: saldoInicial.toString(),
          saldoAtual: saldoInicial.toString(),

          observacoes: data.observacoes ?? null,
          banco: data.banco ?? null,
          bandeira: data.bandeira ?? null,
          ultimosDigitos: data.ultimosDigitos ?? null,
          limite: data.limite != null ? data.limite.toString() : null,
          fechamentoFatura: data.fechamentoFatura ?? null,
          vencimentoFatura: data.vencimentoFatura ?? null,

          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (saldoInicial > 0) {
        await tx.insert(transacoes).values({
          contaId: conta.id,
          tipo: "entrada",
          valor: saldoInicial.toString(),
          data: new Date(),

          descricao: "Saldo inicial da conta",
          categoria: "Saldo inicial",
          formaPagamento: "ajuste",

          parcelado: false,
          recorrente: false,
        });
      }

      return {
        ...conta,
        saldoInicial,
        saldoAtual: saldoInicial,
        limite: conta.limite !== null ? Number(conta.limite) : null,
      };
    });
  }

  /* ATUALIZAR */
  static async atualizar(id: string, data: AtualizarContaInput) {
    const updatedData: any = {
      updatedAt: new Date(),
    };

    if (data.nome !== undefined) updatedData.nome = data.nome;
    if (data.tipo !== undefined) updatedData.tipo = data.tipo;
    if (data.ativo !== undefined) updatedData.ativo = data.ativo;
    if (data.observacoes !== undefined)
      updatedData.observacoes = data.observacoes;

    if (data.limite !== undefined) {
      updatedData.limite =
        data.limite !== null ? data.limite.toString() : null;
    }

    if (data.banco !== undefined) updatedData.banco = data.banco;
    if (data.bandeira !== undefined) updatedData.bandeira = data.bandeira;
    if (data.ultimosDigitos !== undefined)
      updatedData.ultimosDigitos = data.ultimosDigitos;
    if (data.fechamentoFatura !== undefined)
      updatedData.fechamentoFatura = data.fechamentoFatura;
    if (data.vencimentoFatura !== undefined)
      updatedData.vencimentoFatura = data.vencimentoFatura;

    const [conta] = await db
      .update(contas)
      .set(updatedData)
      .where(eq(contas.id, id))
      .returning();

    if (!conta) {
      throw new Error("Conta não encontrada");
    }

    return {
      ...conta,
      saldoInicial: Number(conta.saldoInicial),
      saldoAtual: Number(conta.saldoAtual),
      limite: conta.limite != null ? Number(conta.limite) : null,
    };
  }

  /* REMOVER */
  static async remover(id: string) {
    const result = await db
      .delete(contas)
      .where(eq(contas.id, id))
      .returning({ id: contas.id });

    if (result.length === 0) {
      throw new Error("NOT_FOUND");
    }
  }

  /* SALDO */
  static async ajustarSaldo({
    contaId,
    valor,
    descricao,
  }: {
    contaId: string;
    valor: number;
    descricao: string;
  }) {
    return db.transaction(async (tx) => {
      await tx.insert(transacoes).values({
        contaId: contaId,
        tipo: valor >= 0 ? "entrada" : "saida",
        valor: Math.abs(valor).toString(),
        data: new Date(),

        descricao: descricao ?? "Ajuste de saldo",
        categoria: "Ajuste",
        formaPagamento: "ajuste",

        parcelado: false,
        recorrente: false,
      });


      await tx
        .update(contas)
        .set({
          saldoAtual: sql`${contas.saldoAtual} + ${valor}`,
          updatedAt: new Date(),
        })
        .where(eq(contas.id, contaId));
    });
  }
}