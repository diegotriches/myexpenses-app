// app/api/contato/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contatos } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, email, assunto, mensagem } = body;

    if (!nome || typeof nome !== "string" || nome.trim().length < 2) {
      return NextResponse.json({ error: "Nome deve ter pelo menos 2 caracteres" }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email)) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 });
    }
    const assuntosValidos = ["duvida", "sugestao", "problema", "outro"];
    if (!assunto || !assuntosValidos.includes(assunto)) {
      return NextResponse.json({ error: "Assunto invalido" }, { status: 400 });
    }
    if (!mensagem || typeof mensagem !== "string" || mensagem.trim().length < 10) {
      return NextResponse.json({ error: "Mensagem deve ter pelo menos 10 caracteres" }, { status: 400 });
    }

    const userAgent = req.headers.get("user-agent") || null;
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;

    let userId: string | null = null;
    try { userId = await getUserId(); } catch { userId = null; }

    const [novoContato] = await db
      .insert(contatos)
      .values({
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        assunto,
        mensagem: mensagem.trim(),
        status: "pendente",
        lido: false,
        userAgent,
        ip,
        userId,
      })
      .returning();

    try {
      const assuntoTexto: Record<string, string> = {
        duvida: "Duvida",
        sugestao: "Sugestao",
        problema: "Problema",
        outro: "Outro",
      };
      await sendEmail({
        to: process.env.GMAIL_USER!,
        subject: "[MyExpenses] " + assuntoTexto[assunto] + ": " + nome,
        html: "<p><b>Nome:</b> " + nome + "</p><p><b>Email:</b> " + email + "</p><p><b>Assunto:</b> " + assuntoTexto[assunto] + "</p><p><b>Mensagem:</b></p><p>" + mensagem + "</p><p>ID: " + novoContato.id + "</p>",
        text: "Nome: " + nome + "\nEmail: " + email + "\nAssunto: " + assuntoTexto[assunto] + "\n\nMensagem:\n" + mensagem,
      });
    } catch (emailError) {
      console.error("Erro ao enviar email de contato:", emailError);
    }

    return NextResponse.json(
      { message: "Mensagem enviada com sucesso! Responderemos em breve.", id: novoContato.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao processar contato:", error);
    return NextResponse.json({ error: "Erro ao enviar mensagem. Tente novamente mais tarde." }, { status: 500 });
  }
}