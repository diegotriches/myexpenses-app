// app/api/contato/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contatos } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { Resend } from "resend";

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/contato
 * 
 * Recebe mensagem de contato, salva no banco e envia email
 * 
 * Body:
 * - nome: string (obrigatório)
 * - email: string (obrigatório, formato válido)
 * - assunto: "duvida" | "sugestao" | "problema" | "outro" (obrigatório)
 * - mensagem: string (obrigatório, min 10 chars)
 * 
 * Retorna:
 * - 201: Mensagem enviada com sucesso
 * - 400: Validação falhou
 * - 500: Erro interno
 */
export async function POST(req: NextRequest) {
  try {
    // ========================================
    // 1. PARSE DO BODY
    // ========================================
    
    const body = await req.json();
    const { nome, email, assunto, mensagem } = body;

    console.log("📧 Nova mensagem de contato de:", email);

    // ========================================
    // 2. VALIDAÇÕES
    // ========================================
    
    // Validar nome
    if (!nome || typeof nome !== "string" || nome.trim().length < 2) {
      return NextResponse.json(
        { error: "Nome deve ter pelo menos 2 caracteres" },
        { status: 400 }
      );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    // Validar assunto
    const assuntosValidos = ["duvida", "sugestao", "problema", "outro"];
    if (!assunto || !assuntosValidos.includes(assunto)) {
      return NextResponse.json(
        { error: "Assunto inválido" },
        { status: 400 }
      );
    }

    // Validar mensagem
    if (!mensagem || typeof mensagem !== "string" || mensagem.trim().length < 10) {
      return NextResponse.json(
        { error: "Mensagem deve ter pelo menos 10 caracteres" },
        { status: 400 }
      );
    }

    // ========================================
    // 3. CAPTURAR METADATA
    // ========================================
    
    const userAgent = req.headers.get("user-agent") || null;
    const ip = req.headers.get("x-forwarded-for") || 
               req.headers.get("x-real-ip") || 
               null;

    // Verificar se usuário está logado (opcional)
    let userId: string | null = null;
    try {
      userId = await getUserId();
    } catch (error) {
      // Usuário não está logado, tudo bem
      userId = null;
    }

    // ========================================
    // 4. SALVAR NO BANCO
    // ========================================
    
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

    console.log("✅ Contato salvo no banco:", novoContato.id);

    // ========================================
    // 5. ENVIAR EMAIL VIA RESEND
    // ========================================
    
    try {
      // Mapear assunto para texto legível
      const assuntoTexto: Record<string, string> = {
        duvida: "Dúvida",
        sugestao: "Sugestão",
        problema: "Problema",
        outro: "Outro",
      };

      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || "MyExpenses <noreply@onboarding.resend.dev>",
        to: ["myexpenses@gmail.com"], // ⚠️ ALTERE PARA SEU EMAIL REAL
        replyTo: email, // Permite responder direto pro usuário
        subject: `[MyExpenses] ${assuntoTexto[assunto]}: ${nome}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                .info-row { margin: 15px 0; padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #667eea; }
                .label { font-weight: bold; color: #667eea; }
                .message-box { background: white; padding: 20px; border-radius: 6px; margin-top: 20px; border: 1px solid #e5e7eb; }
                .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                .badge { display: inline-block; padding: 4px 12px; background: #dbeafe; color: #1e40af; border-radius: 12px; font-size: 12px; font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">💬 Nova Mensagem de Contato</h1>
                  <p style="margin: 5px 0 0 0; opacity: 0.9;">MyExpenses</p>
                </div>
                
                <div class="content">
                  <div class="info-row">
                    <span class="label">Nome:</span> ${nome}
                  </div>
                  
                  <div class="info-row">
                    <span class="label">Email:</span> 
                    <a href="mailto:${email}" style="color: #667eea;">${email}</a>
                  </div>
                  
                  <div class="info-row">
                    <span class="label">Assunto:</span> 
                    <span class="badge">${assuntoTexto[assunto]}</span>
                  </div>
                  
                  ${userId ? `
                  <div class="info-row">
                    <span class="label">Usuário ID:</span> ${userId}
                  </div>
                  ` : ''}
                  
                  <div class="message-box">
                    <p style="margin: 0 0 10px 0; color: #667eea; font-weight: bold;">Mensagem:</p>
                    <p style="margin: 0; white-space: pre-wrap;">${mensagem}</p>
                  </div>
                  
                  <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0; font-size: 14px;">
                      💡 <strong>Dica:</strong> Clique em "Responder" para responder diretamente ao remetente.
                    </p>
                  </div>
                </div>
                
                <div class="footer">
                  <p>Recebido em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
                  <p>ID: ${novoContato.id}</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error("❌ Erro ao enviar email:", error);
        // Não falhar a request se email falhar
      } else {
        console.log("✅ Email enviado:", data?.id);
      }
    } catch (emailError) {
      console.error("❌ Erro no serviço de email:", emailError);
      // Não falhar a request se email falhar
    }

    // ========================================
    // 6. RETORNAR SUCESSO
    // ========================================
    
    return NextResponse.json(
      {
        message: "Mensagem enviada com sucesso! Responderemos em breve.",
        id: novoContato.id,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("❌ Erro ao processar contato:", error);
    
    return NextResponse.json(
      { error: "Erro ao enviar mensagem. Tente novamente mais tarde." },
      { status: 500 }
    );
  }
}