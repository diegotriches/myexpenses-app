import { db } from "@/db";
import { contas, extratoConta } from "@/db/schema";
import { eq } from "drizzle-orm";

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
          // createdAt é defaultNow()
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
        // createdAt é defaultNow(), não precisa passar
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