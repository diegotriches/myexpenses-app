// src/app/api/notificacoes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificacoes } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import type { CriarNotificacaoDTO } from "@/types/notificacao";

/**
 * GET /api/notificacoes
 * Lista notificações do usuário
 * 
 * Query params:
 * - lidas=true/false (opcional) - Filtrar por status
 * - limite=10 (opcional) - Limitar resultados
 * 
 * Response: NotificacoesResponse
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lidasParam = searchParams.get("lidas");
    const limiteParam = searchParams.get("limite");

    // Construir condições WHERE
    const conditions = [eq(notificacoes.userId, userId)];
    
    // Filtrar por status de lida
    if (lidasParam !== null) {
      const lidas = lidasParam === "true";
      conditions.push(eq(notificacoes.lida, lidas));
    }

    // Parsear limite (com validação)
    let limite: number | undefined;
    if (limiteParam) {
      const parsed = parseInt(limiteParam, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
        limite = parsed;
      }
    }

    // Executar query
    const queryBase = db
      .select()
      .from(notificacoes)
      .where(and(...conditions))
      .orderBy(desc(notificacoes.createdAt));

    const results = limite 
      ? await queryBase.limit(limite)
      : await queryBase;

    // Contar não lidas (sempre retorna, independente do filtro)
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificacoes)
      .where(
        and(
          eq(notificacoes.userId, userId),
          eq(notificacoes.lida, false)
        )
      );

    return NextResponse.json({
      notificacoes: results,
      total: results.length,
      naoLidas: count || 0,
    });
  } catch (error: any) {
    console.error("❌ Erro ao listar notificações:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao listar notificações" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notificacoes
 * Cria nova notificação (uso interno ou admin)
 * 
 * Body: CriarNotificacaoDTO
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body: CriarNotificacaoDTO = await req.json();

    // Validações obrigatórias
    if (!body.tipo || !body.severidade || !body.titulo || !body.mensagem) {
      return NextResponse.json(
        { error: "Campos obrigatórios: tipo, severidade, titulo, mensagem" },
        { status: 400 }
      );
    }

    // Validar tipos válidos
    const tiposValidos = [
      "FATURA_PROXIMA_VENCIMENTO",
      "FATURA_VENCIDA",
      "FATURA_PAGA",
      "LIMITE_CARTAO_80",
      "LIMITE_CARTAO_95",
      "SALDO_BAIXO",
      "SALDO_NEGATIVO",
      "TRANSACAO_ENTRADA_ALTA",
      "TRANSACAO_SAIDA_ALTA",
    ];

    if (!tiposValidos.includes(body.tipo)) {
      return NextResponse.json(
        { error: "Tipo de notificação inválido" },
        { status: 400 }
      );
    }

    const severidadesValidas = ["info", "warning", "error", "success"];
    if (!severidadesValidas.includes(body.severidade)) {
      return NextResponse.json(
        { error: "Severidade inválida" },
        { status: 400 }
      );
    }

    // Criar notificação
    const [notificacao] = await db
      .insert(notificacoes)
      .values({
        userId,
        tipo: body.tipo,
        severidade: body.severidade,
        titulo: body.titulo,
        mensagem: body.mensagem,
        link: body.link,
        metadata: body.metadata,
      })
      .returning();

    return NextResponse.json(notificacao, { status: 201 });
  } catch (error: any) {
    console.error("❌ Erro ao criar notificação:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criar notificação" },
      { status: 500 }
    );
  }
}