import db from "@/database/db";
import { transacoes } from "@/database/schema/transacoes";
import { cartoes } from "@/database/schema/cartoes";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

// PUT /api/transacoes/:id
export async function PUT(req, { params }) {
    try {
        const id = Number(params.id);
        const body = await req.json();

        let {
            data,
            tipo,
            descricao,
            valor,
            categoria,
            formaPagamento,
            parcela,
            recorrente,
            cartaoId
        } = body;

        // Validar forma de pagamento
        const formasPermitidas = ["dinheiro", "pix", "cartao"];
        if (!formasPermitidas.includes(formaPagamento)) {
            formaPagamento = "dinheiro";
        }

        // Se não for cartão → remover cartaoId
        if (formaPagamento !== "cartao") {
            cartaoId = null;
        }

        // Validar cartão se necessário
        if (formaPagamento === "cartao" && cartaoId) {
            const check = await db
                .select()
                .from(cartoes)
                .where(eq(cartoes.id, Number(cartaoId)));

            if (check.length === 0) {
                return NextResponse.json(
                    { error: "Cartão informado não existe." },
                    { status: 400 }
                );
            }
        }

        const [atualizada] = await db
            .update(transacoes)
            .set({
                data,
                tipo,
                descricao,
                valor,
                categoria,
                formaPagamento,
                parcela,
                recorrente: recorrente ? true : false,
                cartaoId: cartaoId ? Number(cartaoId) : null
            })
            .where(eq(transacoes.id, id))
            .returning();

        if (!atualizada) {
            return NextResponse.json(
                { error: "Transação não encontrada" },
                { status: 404 }
            );
        }

        return NextResponse.json(atualizada);

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/transacoes/:id
export async function DELETE(req, { params }) {
    try {
        const id = Number(params.id);

        const [apagada] = await db
            .delete(transacoes)
            .where(eq(transacoes.id, id))
            .returning({ id: transacoes.id });

        if (!apagada) {
            return NextResponse.json(
                { error: "Transação não encontrada" },
                { status: 404 }
            );
        }

        return NextResponse.json({ sucesso: true, id: apagada.id });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
