import db from "@/database/db";
import { transacoes } from "@/database/schema/transacoes";
import { cartoes } from "@/database/schema/cartoes";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

// GET /api/transacoes
export async function GET() {
    try {
        const result = await db.select().from(transacoes);
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/transacoes
export async function POST(req) {
    try {
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

        // Validar formas de pagamento
        const formasPermitidas = ["dinheiro", "pix", "cartao"];
        if (!formasPermitidas.includes(formaPagamento)) {
            formaPagamento = "dinheiro";
        }

        // Se não for cartão → cartaoId = null
        if (formaPagamento !== "cartao") {
            cartaoId = null;
        }

        // Se for cartão, verificar se existe
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

        // Inserir transação
        const [nova] = await db
            .insert(transacoes)
            .values({
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
            .returning();

        return NextResponse.json(nova, { status: 201 });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
