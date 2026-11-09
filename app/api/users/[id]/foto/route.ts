// src/app/api/users/[id]/foto/route.ts

import { db } from "@/db";
import { users } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { put, del } from "@vercel/blob";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

// POST - Upload de foto
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ 1. Verificar autenticação
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // ✅ 2. Obter ID da URL
    const params = await context.params;
    const targetId = params.id;

    // ✅ 3. Verificar ownership
    if (userId !== targetId) {
      return NextResponse.json(
        { message: "Você não tem permissão para alterar a foto de outro usuário" },
        { status: 403 }
      );
    }

    // ✅ 4. Obter arquivo do FormData (padronizado como "file")
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { message: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // ✅ 5. Validações do arquivo
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: "Arquivo muito grande. Máximo 5MB" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "Formato inválido. Use JPG, PNG ou WebP" },
        { status: 400 }
      );
    }

    // ✅ 6. Buscar usuário
    const [usuarioExistente] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!usuarioExistente) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // ✅ 7. Deletar foto antiga do Vercel Blob (se existir)
    if (usuarioExistente.image) {
      try {
        await del(usuarioExistente.image);
        console.log("✅ Foto antiga deletada:", usuarioExistente.image);
      } catch (error) {
        console.error("⚠️ Erro ao deletar foto antiga:", error);
        // Continua mesmo se falhar
      }
    }

    // ✅ 8. Gerar nome único para o arquivo
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `fotos/user-${userId}-${timestamp}.${ext}`;

    // ✅ 9. Upload para Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });

    console.log("✅ Upload concluído:", blob.url);

    // ✅ 10. Atualizar banco de dados
    const [atualizado] = await db
      .update(users)
      .set({ 
        image: blob.url,
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      });

    if (!atualizado) {
      return NextResponse.json(
        { message: "Erro ao atualizar foto" },
        { status: 500 }
      );
    }

    // ✅ 11. Retornar usuário completo (consistente com service)
    return NextResponse.json(atualizado);
  } catch (err) {
    return respostaDeErro(err, "Erro ao fazer upload da foto");
  }
}

// DELETE - Remover foto
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ 1. Verificar autenticação
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // ✅ 2. Obter ID da URL
    const params = await context.params;
    const targetId = params.id;

    // ✅ 3. Verificar ownership
    if (userId !== targetId) {
      return NextResponse.json(
        { message: "Você não tem permissão para remover a foto de outro usuário" },
        { status: 403 }
      );
    }

    // ✅ 4. Buscar usuário
    const [usuario] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!usuario) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // ✅ 5. Deletar foto do Vercel Blob (se existir)
    if (usuario.image) {
      try {
        await del(usuario.image);
        console.log("✅ Foto deletada do Blob:", usuario.image);
      } catch (error) {
        console.error("⚠️ Erro ao deletar foto do Blob:", error);
        // Continua mesmo se falhar
      }
    }

    // ✅ 6. Atualizar banco (remover URL da foto)
    const [atualizado] = await db
      .update(users)
      .set({ 
        image: null,
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      });

    if (!atualizado) {
      return NextResponse.json(
        { message: "Erro ao remover foto" },
        { status: 500 }
      );
    }

    // ✅ 7. Retornar usuário completo (consistente com service)
    return NextResponse.json(atualizado);
  } catch (err) {
    return respostaDeErro(err, "Erro ao remover foto");
  }
}