import crypto from "crypto";
import { db } from "@/db";
import { contas, transacoes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

interface TransferenciaInput {
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number;
  descricao?: string;
  data: Date;
}

export class TransferenciasService {
  static async transferir(input: TransferenciaInput) {
    const { contaOrigemId, contaDestinoId, valor, descricao, data } = input;

    if (contaOrigemId === contaDestinoId) {
      throw new Error("Conta de origem e destino não podem ser iguais");
    }

    if (valor <= 0) {
      throw new Error("Valor da transferência deve ser maior que zero");
    }

    await db.transaction(async (tx) => {
      const [origem] = await tx
        .select()
        .from(contas)
        .where(eq(contas.id, contaOrigemId));

      const [destino] = await tx
        .select()
        .from(contas)
        .where(eq(contas.id, contaDestinoId));

      if (!origem || !destino) {
        throw new Error("Conta de origem ou destino não encontrada");
      }

      if (origem.tipo !== "BANCARIA" || destino.tipo !== "BANCARIA") {
        throw new Error("Transferências só são permitidas entre contas bancárias");
      }

      if (!origem.ativo || !destino.ativo) {
        throw new Error("Conta inativa não pode participar de transferência");
      }

      if (Number(origem.saldoAtual) < valor) {
        throw new Error("Saldo insuficiente na conta de origem");
      }

      // Débito na conta de origem
      await tx
        .update(contas)
        .set({
          saldoAtual: sql`${contas.saldoAtual} - ${valor}`,
          updatedAt: new Date(),
        })
        .where(eq(contas.id, contaOrigemId));

      // Crédito na conta de destino
      await tx
        .update(contas)
        .set({
          saldoAtual: sql`${contas.saldoAtual} + ${valor}`,
          updatedAt: new Date(),
        })
        .where(eq(contas.id, contaDestinoId));

      const transferenciaId = crypto.randomUUID();

      // Transação de saída
      await tx.insert(transacoes).values({
        contaId: contaOrigemId,
        tipo: "saida",
        valor: valor.toString(),
        descricao: descricao ?? "Transferência enviada",
        data,
        formaPagamento: "transferencia",
        transferenciaId,
      });

      // Transação de entrada
      await tx.insert(transacoes).values({
        contaId: contaDestinoId,
        tipo: "entrada",
        valor: valor.toString(),
        descricao: descricao ?? "Transferência recebida",
        data,
        formaPagamento: "transferencia",
        transferenciaId,
      });
    });
  }
}