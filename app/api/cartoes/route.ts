import { db } from "@/db";
import { cartoes, transacoes } from "@/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    console.log("=== DEBUG GET /api/cartoes ===");

    // 1. Buscar todos os cartões
    const listaCartoes = await db.select().from(cartoes);
    console.log("Registros encontrados:", listaCartoes.length);

    // 2. Para cada cartão, calcular EM USO + DISPONÍVEL
    const resultado = await Promise.all(
      listaCartoes.map(async (cartao) => {
        // buscar transações deste cartão
        const transacoesCartao = await db
          .select()
          .from(transacoes)
          .where(eq(transacoes.cartaoId, cartao.id));

        // somar gastos
        const emUso = transacoesCartao.reduce((total, t) => {
          // Considere apenas SAÍDAS, se esse for seu modelo lógico
          if (t.tipo === "saida") {
            return total + Number(t.valor);
          }
          return total;
        }, 0);

        // disponível = limite - emUso
        const disponivel = cartao.limite
          ? Number(cartao.limite) - emUso
          : 0;

        return {
          ...cartao,
          emUso,
          disponivel,
        };
      })
    );

    return NextResponse.json(resultado, { status: 200 });
  } catch (err) {
    console.error("Erro no GET /api/cartoes:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    console.log("=== DEBUG POST /api/cartoes ===");

    const body = await req.json();
    console.log("Body recebido:", body);

    const {
      nome,
      tipo,
      bandeira,
      empresa,
      limite,
      diaFechamento,
      diaVencimento,
      cor,
      ativo,
      observacoes,
      ultimosDigitos,
    } = body;

    if (!nome || !tipo) {
      return NextResponse.json(
        { error: "Nome e tipo são obrigatórios" },
        { status: 400 }
      );
    }

    const novoCartao = {
      nome,
      tipo,
      bandeira: bandeira ?? null,
      empresa: empresa ?? null,
      limite: limite ? Number(limite) : null,
      diaFechamento: diaFechamento ? Number(diaFechamento) : null,
      diaVencimento: diaVencimento ? Number(diaVencimento) : null,
      cor: cor ?? "#4F46E5",
      ativo: ativo ?? true,
      observacoes: observacoes ?? null,
      ultimosDigitos: ultimosDigitos ?? null,
    };

    console.log("Inserindo no banco:", novoCartao);

    const [novo] = await db.insert(cartoes).values(novoCartao).returning();

    console.log("Criado:", novo);

    return NextResponse.json(novo, { status: 201 });
  } catch (err) {
    console.error("Erro no POST /api/cartoes:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}