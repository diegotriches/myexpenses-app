import { db } from "@/db";
import { contas, extratoConta } from "@/db/schema";
import { eq } from "drizzle-orm";

interface CriarContaInput {
  nome: string;
  ativo?: boolean;
  saldoInicial: number;
  saldoAtual?: number;
  observacoes?: string | null;
  banco?: string | null;
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
          ativo: data.ativo ?? true,

          saldoInicial: saldoInicial.toString(),
          saldoAtual: saldoInicial.toString(),

          observacoes: data.observacoes ?? null,
          banco: data.banco ?? null,

          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // REGISTRA APENAS NO EXTRATO
      if (saldoInicial !== 0) {
        const dataAtual = new Date();
        const dataFormatada = dataAtual.toISOString().split('T')[0]; // YYYY-MM-DD

        await tx.insert(extratoConta).values({
          contaId: conta.id,
          data: dataFormatada, // date type
          tipo: saldoInicial >= 0 ? "entrada" : "saida",
          valor: Math.abs(saldoInicial).toString(),
          descricao: "Saldo inicial da conta",
          saldoApos: saldoInicial.toString(),
          origem: "AJUSTE",
        });
      }

      return {
        ...conta,
        saldoInicial,
        saldoAtual: saldoInicial,
      };
    });
  }

  /* ATUALIZAR */
  static async atualizar(id: string, data: AtualizarContaInput) {
    const updatedData: any = {
      updatedAt: new Date(),
    };

    if (data.nome !== undefined) updatedData.nome = data.nome;
    if (data.ativo !== undefined) updatedData.ativo = data.ativo;
    if (data.observacoes !== undefined)
      updatedData.observacoes = data.observacoes;
    if (data.banco !== undefined) updatedData.banco = data.banco;

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

  /* AJUSTAR SALDO */
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
      // 1. Buscar saldo atual antes do ajuste
      const [contaAtual] = await tx
        .select({ saldoAtual: contas.saldoAtual })
        .from(contas)
        .where(eq(contas.id, contaId));

      if (!contaAtual) {
        throw new Error("Conta não encontrada");
      }

      const saldoAnterior = Number(contaAtual.saldoAtual);
      const novoSaldo = saldoAnterior + valor;

      // 2. REGISTRAR APENAS NO EXTRATO
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toISOString().split('T')[0]; // Formato: YYYY-MM-DD

      await tx.insert(extratoConta).values({
        contaId: contaId,
        data: dataFormatada, // date type
        tipo: valor >= 0 ? "entrada" : "saida",
        valor: Math.abs(valor).toString(),
        descricao: descricao || "Ajuste de saldo",
        saldoApos: novoSaldo.toString(),
        origem: "AJUSTE",
      });

      // 3. Atualizar saldo da conta
      await tx
        .update(contas)
        .set({
          saldoAtual: novoSaldo.toString(),
          updatedAt: new Date(),
        })
        .where(eq(contas.id, contaId));

      return {
        contaId,
        saldoAnterior,
        novoSaldo,
        ajuste: valor,
      };
    });
  }
}