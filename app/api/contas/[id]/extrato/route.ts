import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { extratoConta, contas } from "@/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 🔐 Autenticação
        const userId = await getUserIdFromSession();

        /* 1. Params */
        const { id } = await params;
        const contaId = id;

        if (!contaId) {
            return NextResponse.json(
                { error: "Conta inválida" },
                { status: 400 }
            );
        }

        /* 2. Buscar informações da conta - 🔐 verificar userId */
        const [conta] = await db
            .select()
            .from(contas)
            .where(
                and(
                    eq(contas.id, contaId),
                    eq(contas.userId, userId) // 🔐 Verificar ownership
                )
            );

        if (!conta) {
            return NextResponse.json(
                { error: "Conta não encontrada ou acesso negado" },
                { status: 404 }
            );
        }

        /* 3. Query params */
        const { searchParams } = new URL(req.url);

        const inicio = searchParams.get("inicio");
        const fim = searchParams.get("fim");
        const origem = searchParams.get("origem");
        const tipo = searchParams.get("tipo");

        const limit = Math.min(
            Number(searchParams.get("limit") ?? 50),
            100
        );
        const offset = Number(searchParams.get("offset") ?? 0);

        /* 4. Filtros dinâmicos - 🔐 SEMPRE filtrar por userId */
        const filtros = [
            eq(extratoConta.contaId, contaId),
            eq(extratoConta.userId, userId) // 🔐 CRÍTICO: Adicionar
        ];

        if (inicio) {
            filtros.push(gte(extratoConta.data, inicio));
        }

        if (fim) {
            filtros.push(lte(extratoConta.data, fim));
        }

        if (origem && origem !== "TODAS") {
            filtros.push(eq(extratoConta.origem, origem as any));
        }

        if (tipo && tipo !== "TODOS") {
            filtros.push(eq(extratoConta.tipo, tipo as any));
        }

        /* 5. Query principal - movimentações */
        const registros = await db
            .select()
            .from(extratoConta)
            .where(and(...filtros))
            .orderBy(
                desc(extratoConta.data),
                desc(extratoConta.createdAt)
            )
            .limit(limit)
            .offset(offset);

        /* 6. Contagem total */
        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(extratoConta)
            .where(and(...filtros));

        /* 7. Calcular resumo do período (se houver filtros de data) */
        let resumo = null;
        
        if (inicio && fim) {
            // 🔐 Filtrar movimentações por userId
            const movimentacoesPeriodo = await db
                .select()
                .from(extratoConta)
                .where(
                    and(
                        eq(extratoConta.contaId, contaId),
                        eq(extratoConta.userId, userId), // 🔐 Adicionar
                        gte(extratoConta.data, inicio),
                        lte(extratoConta.data, fim)
                    )
                );

            const totalEntradas = movimentacoesPeriodo
                .filter(m => m.tipo === "entrada")
                .reduce((sum, m) => sum + Number(m.valor), 0);

            const totalSaidas = movimentacoesPeriodo
                .filter(m => m.tipo === "saida")
                .reduce((sum, m) => sum + Number(m.valor), 0);

            // Busca saldo inicial - 🔐 filtrar por userId
            const [primeiraMovAnterior] = await db
                .select()
                .from(extratoConta)
                .where(
                    and(
                        eq(extratoConta.contaId, contaId),
                        eq(extratoConta.userId, userId), // 🔐 Adicionar
                        lte(extratoConta.data, inicio)
                    )
                )
                .orderBy(desc(extratoConta.data), desc(extratoConta.createdAt))
                .limit(1);

            const saldoInicial = primeiraMovAnterior 
                ? Number(primeiraMovAnterior.saldoApos)
                : Number(conta.saldoInicial);

            // Saldo final é o saldoApos da última movimentação do período
            const saldoFinal = registros.length > 0 
                ? Number(registros[0].saldoApos) // Primeiro porque está ordenado DESC
                : saldoInicial;

            resumo = {
                contaId: conta.id,
                contaNome: conta.nome,
                saldoInicial,
                saldoFinal,
                totalEntradas,
                totalSaidas,
                variacao: saldoFinal - saldoInicial,
                periodo: { inicio, fim }
            };
        }

        /* 8. Resposta */
        return NextResponse.json({
            contaId,
            contaNome: conta.nome,
            limit,
            offset,
            total: Number(count),
            pageSize: registros.length,
            resumo,
            extrato: registros.map((r) => ({
                id: r.id,
                data: r.data,
                tipo: r.tipo,
                descricao: r.descricao,
                valor: Number(r.valor),
                saldoApos: Number(r.saldoApos),
                origem: r.origem,
                referenciaId: r.referenciaId,
                createdAt: r.createdAt,
            })),
        });
    } catch (error) {
        console.error("Erro ao buscar extrato da conta:", error);

        if (error instanceof Error && error.message === "Não autenticado") {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: "Erro ao buscar extrato da conta" },
            { status: 500 }
        );
    }
}