import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { NextResponse } from "next/server";

// GET — Retorna o único usuário existente
export async function GET() {
    try {
        const result = await db.select().from(usuarios).limit(1);
        return NextResponse.json(result[0] || null);
    } catch (err) {
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}

// POST — Criar usuário
export async function POST(req) {
    try {
        const body = await req.json();
        const { nome, email, rendaMensal, metaEconomia } = body;

        if (!nome || !email) {
            return NextResponse.json(
                { error: "Nome e e-mail são obrigatórios." },
                { status: 400 }
            );
        }

        const [novo] = await db
            .insert(usuarios)
            .values({
                nome,
                email,
                rendaMensal: rendaMensal || 0,
                metaEconomia: metaEconomia || 0,
            })
            .returning();

        return NextResponse.json(novo, { status: 201 });

    } catch (err) {
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
