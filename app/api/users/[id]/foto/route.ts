import { db } from "@/db";
import { users } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    const formData = await req.formData();
    const file = formData.get("foto") as File;

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

    // Cria diretório se não existir
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "fotos");
    await mkdir(uploadsDir, { recursive: true });

    // Nome único para o arquivo
    const timestamp = Date.now();
    const ext = path.extname(file.name);
    const filename = `user-${id}-${timestamp}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Salva arquivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // URL pública
    const fotoUrl = `/uploads/fotos/${filename}`;

    // Atualiza banco
    const [atualizado] = await db
      .update(users)
      .set({ foto: fotoUrl })
      .where(eq(users.id, id))
      .returning();

    if (!atualizado) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ foto: fotoUrl });
  } catch (err: any) {
    console.error("Erro ao fazer upload:", err);
    return NextResponse.json(
      { message: err.message || "Erro ao fazer upload" },
      { status: 500 }
    );
  }
}

// DELETE - Remover foto
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);

    const [atualizado] = await db
      .update(users)
      .set({ foto: null })
      .where(eq(users.id, id))
      .returning();

    if (!atualizado) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Foto removida com sucesso" });
  } catch (err: any) {
    console.error("Erro ao remover foto:", err);
    return NextResponse.json(
      { message: err.message || "Erro ao remover foto" },
      { status: 500 }
    );
  }
}