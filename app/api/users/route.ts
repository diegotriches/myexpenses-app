// /app/api/users/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // ou drizzle

export async function GET() {
  const users = await prisma.user.findMany();
  return NextResponse.json(users);
}
