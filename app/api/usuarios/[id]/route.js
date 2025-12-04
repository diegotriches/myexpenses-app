import db from "@/database/db";
import { usuarios } from "@/database/schema/usuarios";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

// Atualizar usuário
export async function PUT(req, { params }) {
    try {
        const id = Number(params.id);
        const body = await req.json();

        const {
            nome,
            email,
            rendaMensal,
            metaEconomia
        } = body;

        const [atualizado] = await db
            .update(usuarios)
            .set({
                nome,
                email,
                rendaMensal: rendaMensal || 0,
                metaEconomia: metaEconomia || 0,
            })
            .where(eq(usuarios.id, id))
            .returning();

        if (!atualizado) {
            return NextResponse.json(
                { error: "Usuário não encontrado." },
                { status: 404 }
            );
        }

        return NextResponse.json(atualizado);

    } catch (err) {
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
