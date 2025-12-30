import { db } from "@/db";
import { users } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { put, del } from "@vercel/blob";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // ← Tipo atualizado
) {
  try {
    // AWAIT nos params
    const params = await context.params;
    
    console.log("📥 Params recebidos:", params);
    console.log("📋 ID recebido:", params.id, "Tipo:", typeof params.id);

    // Converter para número
    const id = parseInt(params.id, 10);
    
    console.log("🔢 ID convertido:", id, "isNaN:", isNaN(id));

    // Validar ID
    if (!params.id || isNaN(id) || id <= 0) {
      console.error("❌ ID inválido:", { params, id });
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    console.log("✅ ID válido:", id);

    const formData = await req.formData();
    const file = formData.get("foto") as File;

    console.log("📁 Arquivo recebido:", file?.name, file?.size);

    if (!file) {
      return NextResponse.json(
        { message: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Validações
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

    console.log("✅ Validações passaram");

    // Buscar usuário para verificar se existe e pegar foto antiga
    console.log("🔍 Buscando usuário com ID:", id);
    
    const [usuarioExistente] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    console.log("👤 Usuário encontrado:", usuarioExistente ? "Sim" : "Não");

    if (!usuarioExistente) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Se já tem foto, deletar a antiga do Vercel Blob
    if (usuarioExistente.foto) {
      console.log("🗑️ Deletando foto antiga:", usuarioExistente.foto);
      try {
        await del(usuarioExistente.foto);
        console.log("✅ Foto antiga deletada");
      } catch (error) {
        console.error("⚠️ Erro ao deletar foto antiga:", error);
        // Continua mesmo se falhar ao deletar
      }
    }

    // Nome único para o arquivo
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `fotos/user-${id}-${timestamp}.${ext}`;

    console.log("📤 Fazendo upload para Vercel Blob:", filename);

    // Upload para Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });

    console.log("✅ Upload concluído:", blob.url);

    // Atualiza banco com a URL do Blob
    console.log("💾 Atualizando banco de dados...");
    
    const [atualizado] = await db
      .update(users)
      .set({ 
        foto: blob.url,
      })
      .where(eq(users.id, id))
      .returning();

    console.log("✅ Banco atualizado:", atualizado);

    return NextResponse.json({ 
      foto: blob.url,
      message: "Foto atualizada com sucesso" 
    });
  } catch (err: any) {
    console.error("❌ Erro ao fazer upload:", err);
    console.error("❌ Stack:", err.stack);
    return NextResponse.json(
      { message: err.message || "Erro ao fazer upload" },
      { status: 500 }
    );
  }
}

// DELETE - Remover foto
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // ← Tipo atualizado
) {
  try {
    // ✅ AWAIT nos params
    const params = await context.params;
    
    const id = parseInt(params.id, 10);

    if (!params.id || isNaN(id) || id <= 0) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    // Buscar usuário para pegar URL da foto
    const [usuario] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!usuario) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Deletar foto do Vercel Blob se existir
    if (usuario.foto) {
      try {
        await del(usuario.foto);
      } catch (error) {
        console.error("Erro ao deletar foto do Blob:", error);
        // Continua mesmo se falhar
      }
    }

    // Atualiza banco
    await db
      .update(users)
      .set({ 
        foto: null,
      })
      .where(eq(users.id, id));

    return NextResponse.json({ 
      message: "Foto removida com sucesso" 
    });
  } catch (err: any) {
    console.error("Erro ao remover foto:", err);
    return NextResponse.json(
      { message: err.message || "Erro ao remover foto" },
      { status: 500 }
    );
  }
}