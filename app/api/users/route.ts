import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function GET() {
  try {
    const result = await db.select().from(users);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);

    return NextResponse.json(
      { error: "Erro ao buscar usuários" },
      { status: 500 }
    );
  }
}