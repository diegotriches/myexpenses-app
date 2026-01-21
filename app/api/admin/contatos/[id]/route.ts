// app/api/admin/contatos/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contatos, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verificarAdmin } from "@/lib/admin";

/**
 * GET /api/admin/contatos/[id]
 * 
 * Busca detalhes completos de um contato
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Verificar permissão admin
    await verificarAdmin();

    const { id } = params;

    // Buscar contato com dados do usuário (se existir)
    const resultado = await db
      .select({
        contato: contatos,
        usuario: {
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
        },
      })
      .from(contatos)
      .leftJoin(users, eq(contatos.userId, users.id))
      .where(eq(contatos.id, id))
      .limit(1);

    if (resultado.length === 0) {
      return NextResponse.json(
        { error: "Contato não encontrado" },
        { status: 404 }
      );
    }

    const [data] = resultado;

    return NextResponse.json({
      ...data.contato,
      usuario: data.usuario,
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar contato:", error);
    
    if (error.message.includes("admin") || error.message.includes("Acesso negado")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Erro ao buscar contato" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/contatos/[id]
 * 
 * Atualiza um contato específico
 * 
 * Body:
 * - status?: "pendente" | "em_andamento" | "resolvido" | "arquivado"
 * - lido?: boolean
 * - respondidoEm?: ISO date
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Verificar permissão admin
    await verificarAdmin();

    const { id } = params;
    const body = await req.json();

    const updates: any = {};

    if (body.status) {
      const statusValidos = ["pendente", "em_andamento", "resolvido", "arquivado"];
      if (!statusValidos.includes(body.status)) {
        return NextResponse.json(
          { error: "Status inválido" },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    if (typeof body.lido === "boolean") {
      updates.lido = body.lido;
    }

    if (body.respondidoEm) {
      updates.respondidoEm = new Date(body.respondidoEm);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 }
      );
    }

    const [atualizado] = await db
      .update(contatos)
      .set(updates)
      .where(eq(contatos.id, id))
      .returning();

    if (!atualizado) {
      return NextResponse.json(
        { error: "Contato não encontrado" },
        { status: 404 }
      );
    }

    console.log(`✅ Contato ${id} atualizado:`, updates);

    return NextResponse.json(atualizado);
  } catch (error: any) {
    console.error("❌ Erro ao atualizar contato:", error);
    
    if (error.message.includes("admin") || error.message.includes("Acesso negado")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Erro ao atualizar contato" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/contatos/[id]
 * 
 * Exclui um contato permanentemente
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Verificar permissão admin
    await verificarAdmin();

    const { id } = params;

    const [excluido] = await db
      .delete(contatos)
      .where(eq(contatos.id, id))
      .returning();

    if (!excluido) {
      return NextResponse.json(
        { error: "Contato não encontrado" },
        { status: 404 }
      );
    }

    console.log(`✅ Contato ${id} excluído permanentemente`);

    return NextResponse.json({
      message: "Contato excluído com sucesso",
      id: excluido.id,
    });
  } catch (error: any) {
    console.error("❌ Erro ao excluir contato:", error);
    
    if (error.message.includes("admin") || error.message.includes("Acesso negado")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Erro ao excluir contato" },
      { status: 500 }
    );
  }
}