import db from "@/db";
import { cartoes } from "@/database/schema/cartoes";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

// PUT /api/cartoes/:id
export async function PUT(req, { params }) {
    try {
        const id = Number(params.id);
        const body = await req.json();

        const { nome, tipo, limite, diaFechamento, diaVencimento } = body;

        const [atualizado] = await db
            .update(cartoes)
            .set({
                nome,
                tipo,
                limite,
                diaFechamento,
                diaVencimento
            })
            .where(eq(cartoes.id, id))
            .returning();

        if (!atualizado) {
            return NextResponse.json(
                { error: "Cartão não encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json(atualizado);

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/cartoes/:id
export async function DELETE(req, { params }) {
    try {
        const id = Number(params.id);

        const [excluido] = await db
            .delete(cartoes)
            .where(eq(cartoes.id, id))
            .returning({ id: cartoes.id });

        if (!excluido) {
            return NextResponse.json(
                { error: "Cartão não encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json({ sucesso: true, id: excluido.id });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
