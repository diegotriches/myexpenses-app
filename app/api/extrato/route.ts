import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { extratoConta, contas } from "@/db/schema";
import { eq, and, gte, lte, sql, desc, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        /* 1. Query params */
        const ano = searchParams.get("ano");
        const mes = searchParams.get("mes");
        const contaId = searchParams.get("contaId");
        const origem = searchParams.get("origem");
        const tipo = searchParams.get("tipo");
        const dataInicio = searchParams.get("dataInicio");
        const dataFim = searchParams.get("dataFim");

        /* 2. Validação de período */
        if (!ano || !mes) {
            return NextResponse.json(
                { error: "Ano e mês são obrigatórios" },
                { status: 400 }
            );
        }

        /* 3. Calcular datas do período */
        const mesNum = parseInt(mes);
        const anoNum = parseInt(ano);
        
        const inicio = dataInicio || `${anoNum}-${String(mesNum).padStart(2, "0")}-01`;
        const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
        const fim = dataFim || `${anoNum}-${String(mesNum).padStart(2, "0")}-${ultimoDia}`;

        /* 4. Filtros dinâmicos */
        const filtros = [
            gte(extratoConta.data, inicio),
            lte(extratoConta.data, fim)
        ];

        if (contaId) {
            filtros.push(eq(extratoConta.contaId, contaId));
        }

        if (origem && origem !== "TODAS") {
            filtros.push(eq(extratoConta.origem, origem as any));
        }

        if (tipo && tipo !== "TODOS") {
            filtros.push(eq(extratoConta.tipo, tipo as any));
        }

        /* 5. Buscar movimentações */
        const movimentacoes = await db
            .select({
                id: extratoConta.id,
                contaId: extratoConta.contaId,
                contaNome: contas.nome,
                data: extratoConta.data,
                tipo: extratoConta.tipo,
                valor: extratoConta.valor,
                descricao: extratoConta.descricao,
                saldoApos: extratoConta.saldoApos,
                origem: extratoConta.origem,
                referenciaId: extratoConta.referenciaId,
                createdAt: extratoConta.createdAt,
            })
            .from(extratoConta)
            .innerJoin(contas, eq(extratoConta.contaId, contas.id))
            .where(and(...filtros))
            .orderBy(
                desc(extratoConta.data),
                desc(extratoConta.createdAt)
            );

        /* 6. Buscar contas envolvidas */
        const contasIds = [...new Set(movimentacoes.map(m => m.contaId))];
        
        const contasEnvolvidas = contaId 
            ? await db.select().from(contas).where(eq(contas.id, contaId))
            : await db.select().from(contas).where(inArray(contas.id, contasIds));

        /* 7. Calcular saldos por conta */
        const saldos = await Promise.all(
            contasEnvolvidas.map(async (conta) => {
                // Busca primeira movimentação antes do período
                const [movAnterior] = await db
                    .select()
                    .from(extratoConta)
                    .where(
                        and(
                            eq(extratoConta.contaId, conta.id),
                            lte(extratoConta.data, inicio)
                        )
                    )
                    .orderBy(desc(extratoConta.data), desc(extratoConta.createdAt))
                    .limit(1);

                const saldoInicial = movAnterior 
                    ? Number(movAnterior.saldoApos)
                    : Number(conta.saldoInicial);

                // Movimentações desta conta no período
                const movsConta = movimentacoes.filter(m => m.contaId === conta.id);

                const totalEntradas = movsConta
                    .filter(m => m.tipo === "entrada")
                    .reduce((sum, m) => sum + Number(m.valor), 0);

                const totalSaidas = movsConta
                    .filter(m => m.tipo === "saida")
                    .reduce((sum, m) => sum + Number(m.valor), 0);

                // Saldo final é o saldo atual da conta
                const saldoFinal = Number(conta.saldoAtual);

                return {
                    contaId: conta.id,
                    contaNome: conta.nome,
                    saldoInicial,
                    saldoFinal,
                    totalEntradas,
                    totalSaidas,
                };
            })
        );

        /* 8. Resposta */
        return NextResponse.json({
            periodo: { ano: anoNum, mes: mesNum, inicio, fim },
            saldos,
            movimentacoes: movimentacoes.map(m => ({
                id: m.id,
                contaId: m.contaId,
                contaNome: m.contaNome,
                data: m.data,
                tipo: m.tipo,
                valor: Number(m.valor),
                descricao: m.descricao,
                saldoApos: Number(m.saldoApos),
                origem: m.origem,
                referenciaId: m.referenciaId,
            })),
        });
    } catch (error) {
        console.error("Erro ao buscar extrato:", error);
        return NextResponse.json(
            { error: "Erro ao buscar extrato" },
            { status: 500 }
        );
    }
}