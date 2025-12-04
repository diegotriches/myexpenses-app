import db from "@/database/db";
import { usuarios } from "@/database/schema/usuarios";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

// Atualizar foto de usuário (Cloudinary URL)
export async function POST(req, { params }) {
    try {
        const id = Number(params.id);
        const { fotoUrl } = await req.json();

        if (!fotoUrl) {
            return NextResponse.json(
                { error: "Nenhuma URL de foto enviada." },
                { status: 400 }
            );
        }

        const [updated] = await db
            .update(usuarios)
            .set({ foto: fotoUrl })
            .where(eq(usuarios.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json(
                { error: "Usuário não encontrado." },
                { status: 404 }
            );
        }

        return NextResponse.json({ sucesso: true, foto: fotoUrl });

    } catch (err) {
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
