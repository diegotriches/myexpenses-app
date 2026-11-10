// app/api/admin/contatos/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contatos, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verificarAdmin } from "@/lib/admin";
import { respostaDeErro } from "@/lib/rota";
import { ehStatusContato } from "@/types/contato";

/**
 * GET /api/admin/contatos/[id]
 * 
 * Busca detalhes completos de um contato
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Verificar permissão admin
    await verificarAdmin();

    const { id } = await params;

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
  } catch (error) {
    return respostaDeErro(error, "Erro ao buscar contato");
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Verificar permissão admin
    await verificarAdmin();

    const { id } = await params;
    const body = await req.json();

    const updates: Partial<typeof contatos.$inferInsert> = {};

    if (body.status) {
      if (!ehStatusContato(body.status)) {
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
  } catch (error) {
    return respostaDeErro(error, "Erro ao atualizar contato");
  }
}

/**
 * DELETE /api/admin/contatos/[id]
 * 
 * Exclui um contato permanentemente
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Verificar permissão admin
    await verificarAdmin();

    const { id } = await params;

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
  } catch (error) {
    return respostaDeErro(error, "Erro ao excluir contato");
  }
}