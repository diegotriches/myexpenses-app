import { db } from "@/db";
import { contas, transacoes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

interface CriarTransacaoInput {
    contaId: string;
    tipo: "entrada" | "saida";
    valor: number;
    data: Date;
    descricao?: string;
    categoria?: string | null;
    formaPagamento?:
    | "dinheiro"
    | "pix"
    | "cartao"
    | "transferencia"
    | "ajuste"
    | null;
}

export class TransacoesService {
    static async criar(input: CriarTransacaoInput) {
        const {
            contaId,
            tipo,
            valor,
            data,
            descricao,
            categoria,
            formaPagamento,
        } = input;

        if (valor <= 0) {
            throw new Error("Valor da transação deve ser maior que zero");
        }

        return db.transaction(async (tx) => {
            const [conta] = await tx
                .select()
                .from(contas)
                .where(eq(contas.id, contaId));

            if (!conta) {
                throw new Error("Conta não encontrada");
            }

            if (!conta.ativo) {
                throw new Error("Conta inativa");
            }

            if (
                conta.tipo === "BANCARIA" &&
                tipo === "saida" &&
                Number(conta.saldoAtual) < valor
            ) {
                throw new Error("Saldo insuficiente");
            }

            // 1. Cria transação
            const [transacao] = await tx
                .insert(transacoes)
                .values({
                    contaId,
                    tipo,
                    valor: valor.toString(),
                    data,

                    descricao: descricao ?? null,
                    categoria: categoria ?? null,
                    formaPagamento: formaPagamento ?? "dinheiro",

                    parcelado: false,
                    recorrente: false,
                })
                .returning();


            // 2. Atualiza saldo da conta
            await tx
                .update(contas)
                .set({
                    saldoAtual:
                        tipo === "entrada"
                            ? sql`${contas.saldoAtual} + ${valor}`
                            : sql`${contas.saldoAtual} - ${valor}`,
                    updatedAt: new Date(),
                })
                .where(eq(contas.id, contaId));

            return {
                ...transacao,
                valor: Number(transacao.valor),
            };
        });
    }

    static async remover(transacaoId: string) {
        return db.transaction(async (tx) => {
            const [transacao] = await tx
                .select()
                .from(transacoes)
                .where(eq(transacoes.id, transacaoId));

            if (!transacao) {
                throw new Error("Transação não encontrada");
            }

            if (transacao.transferenciaId) {
                throw new Error(
                    "Transações de transferência só podem ser excluídas em conjunto"
                );
            }

            const valor = Number(transacao.valor);

            await tx
                .update(contas)
                .set({
                    saldoAtual:
                        transacao.tipo === "entrada"
                            ? sql`${contas.saldoAtual} - ${valor}`
                            : sql`${contas.saldoAtual} + ${valor}`,
                    updatedAt: new Date(),
                })
                .where(eq(contas.id, transacao.contaId));

            await tx
                .delete(transacoes)
                .where(eq(transacoes.id, transacaoId));

            return {
                ...transacao,
                valor,
            };
        });
    }
}