import { db } from "@/db";
import { transactions } from "@/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function GET() {
  const data = await db.select().from(transactions);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();

  const result = await db.insert(transactions).values({
    type: body.type,
    category: body.category,
    value: body.value,
    userId: body.userId,
  }).returning();

  return NextResponse.json(result[0]);
}
