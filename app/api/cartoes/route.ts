import { db } from "@/db";
import { cartoes } from "@/db/schema";
import { NextResponse } from "next/server";

// GET /api/cartoes
export async function GET() {
    try {
        const result = await db.select().from(cartoes).orderBy(cartoes.id);
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/cartoes
export async function POST(req) {
    try {
        const body = await req.json();
        const { nome, tipo, limite, diaFechamento, diaVencimento } = body;

        if (!nome || !tipo) {
            return NextResponse.json(
                { erro: "Nome e tipo são obrigatórios" },
                { status: 400 }
            );
        }

        const [novo] = await db
            .insert(cartoes)
            .values({
                nome,
                tipo,
                limite: limite ?? null,
                diaFechamento: diaFechamento ?? null,
                diaVencimento: diaVencimento ?? null
            })
            .returning();

        return NextResponse.json(novo, { status: 201 });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}