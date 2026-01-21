// app/api/admin/contatos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contatos } from "@/db/schema";
import { eq, desc, and, or, like, sql } from "drizzle-orm";
import { verificarAdmin } from "@/lib/admin";

/**
 * GET /api/admin/contatos
 * 
 * Lista contatos com filtros
 * 
 * Query params:
 * - status: "pendente" | "em_andamento" | "resolvido" | "arquivado" | "todos"
 * - assunto: "duvida" | "sugestao" | "problema" | "outro" | "todos"
 * - lido: "true" | "false" | "todos"
 * - busca: string (busca em nome, email, mensagem)
 * - dataInicio: ISO date
 * - dataFim: ISO date
 * - limit: number (default 50)
 * - offset: number (default 0)
 */
export async function GET(req: NextRequest) {
  try {
    // 🔐 Verificar permissão admin
    await verificarAdmin();

    const { searchParams } = new URL(req.url);

    // Parâmetros de filtro
    const status = searchParams.get("status") || "todos";
    const assunto = searchParams.get("assunto") || "todos";
    const lido = searchParams.get("lido") || "todos";
    const busca = searchParams.get("busca") || "";
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Construir filtros dinâmicos
    const filtros = [];

    if (status !== "todos") {
      filtros.push(eq(contatos.status, status as any));
    }

    if (assunto !== "todos") {
      filtros.push(eq(contatos.assunto, assunto));
    }

    if (lido !== "todos") {
      filtros.push(eq(contatos.lido, lido === "true"));
    }

    if (busca) {
      filtros.push(
        or(
          like(contatos.nome, `%${busca}%`),
          like(contatos.email, `%${busca}%`),
          like(contatos.mensagem, `%${busca}%`)
        )!
      );
    }

    if (dataInicio) {
      filtros.push(sql`${contatos.createdAt} >= ${new Date(dataInicio)}`);
    }

    if (dataFim) {
      const fimDia = new Date(dataFim);
      fimDia.setHours(23, 59, 59, 999);
      filtros.push(sql`${contatos.createdAt} <= ${fimDia}`);
    }

    // Buscar contatos
    const resultado = await db
      .select()
      .from(contatos)
      .where(filtros.length > 0 ? and(...filtros) : undefined)
      .orderBy(desc(contatos.createdAt))
      .limit(limit)
      .offset(offset);

    // Contar total (para paginação)
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(contatos)
      .where(filtros.length > 0 ? and(...filtros) : undefined);

    // Estatísticas rápidas
    const [stats] = await db
      .select({
        pendentes: sql<number>`count(*) filter (where status = 'pendente')`,
        emAndamento: sql<number>`count(*) filter (where status = 'em_andamento')`,
        resolvidos: sql<number>`count(*) filter (where status = 'resolvido')`,
        arquivados: sql<number>`count(*) filter (where status = 'arquivado')`,
        naoLidos: sql<number>`count(*) filter (where lido = false)`,
      })
      .from(contatos);

    return NextResponse.json({
      contatos: resultado,
      paginacao: {
        total: Number(total),
        limit,
        offset,
        hasMore: offset + limit < Number(total),
      },
      estatisticas: {
        pendentes: Number(stats.pendentes),
        emAndamento: Number(stats.emAndamento),
        resolvidos: Number(stats.resolvidos),
        arquivados: Number(stats.arquivados),
        naoLidos: Number(stats.naoLidos),
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao listar contatos:", error);
    
    if (error.message.includes("admin") || error.message.includes("Acesso negado")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Erro ao buscar contatos" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/contatos
 * 
 * Atualiza múltiplos contatos de uma vez (ações em lote)
 * 
 * Body:
 * - ids: string[] (IDs dos contatos)
 * - acao: "marcar_lido" | "marcar_nao_lido" | "mudar_status" | "arquivar"
 * - novoStatus?: "pendente" | "em_andamento" | "resolvido" | "arquivado"
 */
export async function PATCH(req: NextRequest) {
  try {
    // 🔐 Verificar permissão admin
    await verificarAdmin();

    const body = await req.json();
    const { ids, acao, novoStatus } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "IDs dos contatos são obrigatórios" },
        { status: 400 }
      );
    }

    if (!acao) {
      return NextResponse.json(
        { error: "Ação é obrigatória" },
        { status: 400 }
      );
    }

    let updates: any = {};

    switch (acao) {
      case "marcar_lido":
        updates = { lido: true };
        break;
      
      case "marcar_nao_lido":
        updates = { lido: false };
        break;
      
      case "mudar_status":
        if (!novoStatus) {
          return NextResponse.json(
            { error: "novoStatus é obrigatório para mudar_status" },
            { status: 400 }
          );
        }
        updates = { status: novoStatus };
        break;
      
      case "arquivar":
        updates = { status: "arquivado", lido: true };
        break;
      
      default:
        return NextResponse.json(
          { error: "Ação inválida" },
          { status: 400 }
        );
    }

    // Atualizar contatos
    const resultado = await db
      .update(contatos)
      .set(updates)
      .where(sql`${contatos.id} = ANY(${ids})`)
      .returning();

    console.log(`✅ ${resultado.length} contato(s) atualizado(s) - Ação: ${acao}`);

    return NextResponse.json({
      message: `${resultado.length} contato(s) atualizado(s)`,
      atualizados: resultado.length,
    });
  } catch (error: any) {
    console.error("❌ Erro ao atualizar contatos:", error);
    
    if (error.message.includes("admin") || error.message.includes("Acesso negado")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Erro ao atualizar contatos" },
      { status: 500 }
    );
  }
}