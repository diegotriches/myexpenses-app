import { db } from "@/db";
import { contas, transacoes, extratoConta, cartoes } from "@/db/schema";
import { eq } from "drizzle-orm";

interface CriarTransacaoInput {
    contaId?: string;
    tipo: "entrada" | "saida";
    valor: number;
    data: Date;
    descricao?: string;
    categoria?: string | null;
    formaPagamento?: "dinheiro" | "pix" | "cartao" | null;
    cartaoId?: number | null;
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
            cartaoId,
        } = input;

        if (valor <= 0) {
            throw new Error("Valor da transação deve ser maior que zero");
        }

        return db.transaction(async (tx) => {
            let contaIdFinal: string | undefined = contaId;

            // Se for despesa com cartão, busca a conta vinculada ao cartão
            if (tipo === "saida" && formaPagamento === "cartao") {
                if (!cartaoId) {
                    throw new Error("Cartão é obrigatório quando forma de pagamento é cartão");
                }

                const [cartao] = await tx
                    .select()
                    .from(cartoes)
                    .where(eq(cartoes.id, cartaoId));

                if (!cartao) {
                    throw new Error("Cartão não encontrado");
                }

                if (!cartao.ativo) {
                    throw new Error("Cartão inativo");
                }

                // Usa a conta vinculada ao cartão
                contaIdFinal = cartao.contaVinculadaId || undefined;

                // Se cartão não tem conta vinculada, permite criar mesmo assim
                if (!contaIdFinal) {
                    console.warn(`Cartão ${cartao.nome} não possui conta vinculada`);
                }
            } else {
                // Para dinheiro/PIX/receitas, contaId é obrigatório
                if (!contaIdFinal) {
                    throw new Error("Conta é obrigatória");
                }
            }

            // Se tem contaId, valida a conta
            if (contaIdFinal) {
                const [conta] = await tx
                    .select()
                    .from(contas)
                    .where(eq(contas.id, contaIdFinal));

                if (!conta) {
                    throw new Error("Conta não encontrada");
                }

                if (!conta.ativo) {
                    throw new Error("Conta inativa");
                }

                // LÓGICA: Determina se deve impactar o saldo
                const deveImpactarSaldo =
                    tipo === "entrada" || // Receitas SEMPRE impactam
                    (tipo === "saida" && formaPagamento !== "cartao"); // Despesas SÓ se não for cartão

                const saldoAtual = Number(conta.saldoAtual);

                // Calcula novo saldo apenas se deve impactar
                let novoSaldo = saldoAtual;
                if (deveImpactarSaldo) {
                    novoSaldo = tipo === "entrada"
                        ? saldoAtual + valor
                        : saldoAtual - valor;

                    // Validação de saldo insuficiente (removida validação de tipo)
                    if (tipo === "saida" && saldoAtual < valor) {
                        throw new Error("Saldo insuficiente");
                    }
                }

                // 1. Cria transação
                const [transacao] = await tx
                    .insert(transacoes)
                    .values({
                        contaId: contaIdFinal,
                        tipo,
                        valor: valor.toString(),
                        data,

                        descricao: descricao ?? null,
                        categoria: categoria ?? null,
                        formaPagamento: formaPagamento ?? "dinheiro",
                        cartaoId: cartaoId ?? null,

                        parcelado: false,
                        recorrente: false,
                    })
                    .returning();

                // 2. Registra no extrato APENAS se impactar o saldo
                if (deveImpactarSaldo) {
                    const dataFormatada = data.toISOString().split('T')[0];

                    await tx.insert(extratoConta).values({
                        contaId: contaIdFinal,
                        data: dataFormatada,
                        tipo,
                        valor: valor.toString(),
                        descricao: descricao || `Transação ${tipo === "entrada" ? "recebida" : "realizada"}`,
                        saldoApos: novoSaldo.toString(),
                        origem: "TRANSACAO_MANUAL",
                        referenciaId: transacao.id,
                    });

                    // 3. Atualiza saldo da conta
                    await tx
                        .update(contas)
                        .set({
                            saldoAtual: novoSaldo.toString(),
                            updatedAt: new Date(),
                        })
                        .where(eq(contas.id, contaIdFinal));
                }

                return {
                    ...transacao,
                    valor: Number(transacao.valor),
                    impactouSaldo: deveImpactarSaldo,
                };
            } else {
                // Cartão sem conta vinculada - não deveria permitir criar
                throw new Error("Cartão deve ter uma conta vinculada para criar transações");
            }
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
                    "Transferências devem ser gerenciadas na página de Extrato ou Transferências"
                );
            }

            const valor = Number(transacao.valor);

            // LÓGICA: Verifica se deve reverter o saldo
            const deveReverterSaldo =
                transacao.tipo === "entrada" || // Receitas sempre revertem
                (transacao.tipo === "saida" && transacao.formaPagamento !== "cartao"); // Despesas só se não for cartão

            if (deveReverterSaldo && transacao.contaId) {
                // Busca saldo atual da conta
                const [conta] = await tx
                    .select({ saldoAtual: contas.saldoAtual })
                    .from(contas)
                    .where(eq(contas.id, transacao.contaId));

                if (!conta) {
                    throw new Error("Conta não encontrada");
                }

                const saldoAtual = Number(conta.saldoAtual);

                // Reverte o saldo (inverso da operação original)
                const novoSaldo = transacao.tipo === "entrada"
                    ? saldoAtual - valor
                    : saldoAtual + valor;

                // Registra estorno no extrato
                const dataAtual = new Date();
                const dataFormatada = dataAtual.toISOString().split('T')[0];

                await tx.insert(extratoConta).values({
                    contaId: transacao.contaId,
                    data: dataFormatada,
                    tipo: transacao.tipo === "entrada" ? "saida" : "entrada", // Inverso
                    valor: valor.toString(),
                    descricao: `Estorno: ${transacao.descricao || "Transação removida"}`,
                    saldoApos: novoSaldo.toString(),
                    origem: "ESTORNO",
                    referenciaId: transacaoId,
                });

                // Atualiza saldo da conta
                await tx
                    .update(contas)
                    .set({
                        saldoAtual: novoSaldo.toString(),
                        updatedAt: new Date(),
                    })
                    .where(eq(contas.id, transacao.contaId));
            }

            // Remove a transação
            await tx
                .delete(transacoes)
                .where(eq(transacoes.id, transacaoId));

            return {
                ...transacao,
                valor,
                reverteuSaldo: deveReverterSaldo,
            };
        });
    }
}