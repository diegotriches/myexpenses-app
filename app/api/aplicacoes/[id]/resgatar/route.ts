// src/app/api/aplicacoes/[id]/resgatar/route.ts
//
// Body (JSON, opcional):
//   { "total": true }            → resgata tudo (padrão se não vier body)
//   { "valor": 250.00 }          → resgate parcial BRUTO de 250,00
//                                  (o IR é descontado desse valor)

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { executarResgate } from "@/lib/aplicacaoEngine";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await context.params;

    let body: { total?: boolean; valor?: number } = {};
    try { body = await req.json(); } catch { /* sem body = resgate total */ }

    const total = body.total === true || body.valor === undefined;

    const detalhamento = await executarResgate({
      aplicacaoId: id,
      userId,
      total,
      valorBruto: body.valor,
    });

    return NextResponse.json({ ok: true, detalhamento });
  } catch (error: any) {
    console.error("Erro ao resgatar aplicação:", error);
    const mensagem = error.message || "Erro ao resgatar aplicação";
    const status = /não encontrad/i.test(mensagem) ? 404 : /inválido|maior que|já foi/i.test(mensagem) ? 400 : 500;
    return NextResponse.json({ error: mensagem }, { status });
  }
}