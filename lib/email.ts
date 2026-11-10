import nodemailer from "nodemailer";

// ========================================
// VALIDAÇÕES E INICIALIZAÇÃO
// ========================================

if (!process.env.GMAIL_USER) {
  console.error("❌ [EMAIL] GMAIL_USER não está definido no .env");
  throw new Error(
    "❌ GMAIL_USER não está definido.\n" +
      "Configure a variável GMAIL_USER no arquivo .env.local\n" +
      "Exemplo: GMAIL_USER=myexpenses.noreply@gmail.com",
  );
}

if (!process.env.GMAIL_APP_PASSWORD) {
  console.error("❌ [EMAIL] GMAIL_APP_PASSWORD não está definido no .env");
  throw new Error(
    "❌ GMAIL_APP_PASSWORD não está definido.\n" +
      "Configure a variável GMAIL_APP_PASSWORD no arquivo .env.local\n" +
      "Gere em: myaccount.google.com → Segurança → Senhas de app",
  );
}

// Inicializar transporter do Nodemailer com Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

if (process.env.NODE_ENV === "development") {
  console.log(
    "✅ [EMAIL] Nodemailer inicializado com Gmail:",
    process.env.GMAIL_USER,
  );
}

// ========================================
// CONFIGURAÇÕES DE EMAIL
// ========================================

const EMAIL_FROM = `MyExpenses <${process.env.GMAIL_USER}>`;
const APP_NAME = "MyExpenses";
const APP_URL =
  process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

// Rate limiting simples (em memória)
const emailRateLimit = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_EMAILS_PER_WINDOW = 5;

// ========================================
// TIPOS
// ========================================

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ========================================
// HELPERS DE VALIDAÇÃO
// ========================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const lastSent = emailRateLimit.get(email) || 0;

  if (now - lastSent > RATE_LIMIT_WINDOW) {
    emailRateLimit.delete(email);
    return true;
  }

  const count = emailRateLimit.get(`${email}_count`) || 0;
  if (count >= MAX_EMAILS_PER_WINDOW) {
    console.warn(`⚠️ [EMAIL] Rate limit atingido para: ${email}`);
    return false;
  }

  return true;
}

function updateRateLimit(email: string) {
  const now = Date.now();
  const count = (emailRateLimit.get(`${email}_count`) || 0) + 1;

  emailRateLimit.set(email, now);
  emailRateLimit.set(`${email}_count`, count);

  setTimeout(() => {
    emailRateLimit.delete(email);
    emailRateLimit.delete(`${email}_count`);
  }, RATE_LIMIT_WINDOW);
}

// ========================================
// FUNÇÃO PRINCIPAL: Enviar Email
// ========================================

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    if (!isValidEmail(to)) {
      console.error("❌ [EMAIL] Email inválido:", to);
      throw new Error("Email inválido");
    }

    if (!checkRateLimit(to)) {
      throw new Error(
        "Rate limit atingido. Tente novamente em alguns minutos.",
      );
    }

    console.log("📧 [EMAIL] Enviando email para:", to);
    console.log("📧 [EMAIL] Assunto:", subject);

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || undefined,
    });

    updateRateLimit(to);

    console.log("✅ [EMAIL] Enviado com sucesso:", info.messageId);
    return { success: true, id: info.messageId };
  } catch (error) {
    console.error("❌ [EMAIL] Erro:", error);
    return {
      success: false,
      error: error instanceof Error && error.message ? error.message : "Erro desconhecido",
    };
  }
}

export async function sendEmailWithRetry(
  params: SendEmailParams,
  maxRetries: number = 3,
): Promise<SendEmailResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendEmail(params);

      if (result.success) {
        return result;
      }

      lastError = new Error(result.error);

      if (
        result.error?.includes("inválido") ||
        result.error?.includes("Rate limit")
      ) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        const delay = attempt * 1000;
        console.warn(
          `⚠️ [EMAIL] Tentativa ${attempt} falhou. Tentando novamente em ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw lastError;
}

// ========================================
// TEMPLATES DE EMAIL
// ========================================

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string,
) {
  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperação de Senha</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; color: #333; background-color: #f4f4f4; padding: 20px;
          }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { font-size: 28px; margin-bottom: 10px; }
          .content { padding: 40px 30px; background: #ffffff; }
          .content p { margin-bottom: 20px; color: #555; }
          .button { display: inline-block; padding: 16px 32px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .link-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; word-break: break-all; font-size: 14px; color: #666; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .warning p { margin: 0; color: #856404; }
          .footer { background: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0; }
          .footer p { margin: 5px 0; color: #888; font-size: 14px; }
          .footer a { color: #667eea; text-decoration: none; }
          .divider { height: 1px; background: #e0e0e0; margin: 30px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Recuperação de Senha</h1>
            <p style="margin: 0; opacity: 0.9;">MyExpenses - Gestão Financeira</p>
          </div>
          <div class="content">
            <p style="font-size: 18px; margin-bottom: 10px;">Olá, <strong>${name || "Usuário"}</strong>!</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>${APP_NAME}</strong>.</p>
            <p>Para criar uma nova senha, clique no botão abaixo:</p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Redefinir Minha Senha</a>
            </div>
            <p style="font-size: 14px; color: #888;">Ou copie e cole este link no seu navegador:</p>
            <div class="link-box">${resetLink}</div>
            <div class="divider"></div>
            <div class="warning"><p><strong>⚠️ Este link expira em 1 hora.</strong></p></div>
            <p style="font-size: 14px; color: #888; margin-top: 30px;">
              Se você <strong>não solicitou</strong> esta recuperação de senha, ignore este email. Sua senha permanecerá segura e inalterada.
            </p>
          </div>
          <div class="footer">
            <p><strong>${APP_NAME}</strong></p>
            <p>Gestão Financeira Pessoal</p>
            <div style="margin: 15px 0;"><a href="${APP_URL}">Acessar ${APP_NAME}</a></div>
            <p style="font-size: 12px; color: #aaa; margin-top: 20px;">Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Recuperação de Senha - ${APP_NAME}

Olá, ${name || "Usuário"}!

Acesse o link abaixo para redefinir sua senha:
${resetLink}

⚠️ Este link expira em 1 hora.

Se você não solicitou esta recuperação, ignore este email.

---
${APP_NAME} - Gestão Financeira Pessoal
${APP_URL}
  `;

  return sendEmailWithRetry({
    to,
    subject: `🔐 Recuperação de Senha - ${APP_NAME}`,
    html,
    text,
  });
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Senha Alterada</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .button { display: inline-block; padding: 16px 32px; background: #52c41a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; color: #856404; }
          .footer { background: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0; font-size: 14px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>✅ Senha Alterada com Sucesso</h1></div>
          <div class="content">
            <p style="font-size: 18px;">Olá, <strong>${name || "Usuário"}</strong>!</p>
            <p>Sua senha foi <strong>alterada com sucesso</strong>. Você já pode fazer login com sua nova senha.</p>
            <div style="text-align: center;">
              <a href="${APP_URL}/login" class="button">Fazer Login</a>
            </div>
            <div class="alert">
              <p><strong>⚠️ Você não fez esta alteração?</strong> Entre em contato com nosso suporte imediatamente.</p>
            </div>
          </div>
          <div class="footer">
            <p><strong>${APP_NAME}</strong> - Gestão Financeira Pessoal</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Senha Alterada com Sucesso - ${APP_NAME}

Olá, ${name || "Usuário"}!

Sua senha foi alterada com sucesso. Fazer login: ${APP_URL}/login

⚠️ Se você não fez esta alteração, entre em contato com nosso suporte imediatamente.

---
${APP_NAME} - Gestão Financeira Pessoal
  `;

  return sendEmailWithRetry({
    to,
    subject: `✅ Senha Alterada - ${APP_NAME}`,
    html,
    text,
  });
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationToken: string,
) {
  // ✅ CORRIGIDO: encodeURIComponent garante que o token chegue íntegro na URL
  // mesmo que contenha caracteres especiais (improvável com hex, mas seguro).
  const verificationLink = `${APP_URL}/verify-email?token=${encodeURIComponent(verificationToken)}`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifique seu Email</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .button { display: inline-block; padding: 16px 32px; background: #667eea; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .link-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; word-break: break-all; font-size: 13px; color: #666; font-family: monospace; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; color: #856404; font-size: 14px; }
          .footer { background: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0; font-size: 14px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Verifique seu Email</h1>
            <p style="margin: 0; opacity: 0.9;">MyExpenses - Gestão Financeira</p>
          </div>
          <div class="content">
            <p style="font-size: 18px; margin-bottom: 16px;">Olá, <strong>${name}</strong>!</p>
            <p style="margin-bottom: 16px;">Obrigado por se cadastrar no <strong>MyExpenses</strong>! Para ativar sua conta, clique no botão abaixo:</p>
            <div style="text-align: center;">
              <a href="${verificationLink}" class="button">✅ Verificar Minha Conta</a>
            </div>
            <p style="font-size: 14px; color: #888; margin-top: 24px;">Se o botão não funcionar, copie e cole este link no seu navegador:</p>
            <div class="link-box">${verificationLink}</div>
            <div class="warning">
              <strong>⚠️ Este link expira em 24 horas.</strong><br>
              Se você não criou uma conta no MyExpenses, ignore este e-mail.
            </div>
          </div>
          <div class="footer">
            <p><strong>MyExpenses</strong> - Gestão Financeira Pessoal</p>
            <p style="margin-top: 8px; font-size: 12px;">Este é um e-mail automático, por favor não responda.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Verifique seu Email - MyExpenses
 
Olá, ${name}!
 
Para ativar sua conta, acesse o link abaixo:
${verificationLink}
 
⚠️ Este link expira em 24 horas.
 
Se você não criou uma conta no MyExpenses, ignore este e-mail.
 
---
MyExpenses - Gestão Financeira Pessoal
  `;

  return sendEmailWithRetry({
    to,
    subject: `📧 Confirme seu cadastro no MyExpenses`,
    html,
    text,
  });
}


// ========================================
// TROCA DE E-MAIL
// ========================================

/** Estilo compartilhado pelos e-mails de troca de endereço */
const ESTILO_TROCA_EMAIL = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
  .content { padding: 40px 30px; }
  .button { display: inline-block; padding: 16px 32px; background: #667eea; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
  .link-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; word-break: break-all; font-size: 13px; color: #666; font-family: monospace; }
  .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; color: #856404; font-size: 14px; }
  .footer { background: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0; font-size: 14px; color: #888; }
`;

const escaparHtml = (texto: string) =>
  texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Link para confirmar o novo endereço; a troca só acontece ao abrir o link. */
export async function sendEmailChangeConfirmation(to: string, name: string, token: string) {
  const link = `${APP_URL}/confirmar-email?token=${encodeURIComponent(token)}`;
  const nome = escaparHtml(name);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirme seu novo e-mail</title>
        <style>${ESTILO_TROCA_EMAIL}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Confirme seu novo e-mail</h1>
            <p style="margin: 0; opacity: 0.9;">MyExpenses - Gestão Financeira</p>
          </div>
          <div class="content">
            <p style="font-size: 18px; margin-bottom: 16px;">Olá, <strong>${nome}</strong>!</p>
            <p style="margin-bottom: 16px;">Recebemos um pedido para usar este endereço na sua conta do <strong>MyExpenses</strong>. Para confirmar a troca, clique no botão abaixo:</p>
            <div style="text-align: center;">
              <a href="${link}" class="button">✅ Confirmar novo e-mail</a>
            </div>
            <p style="font-size: 14px; color: #888; margin-top: 24px;">Se o botão não funcionar, copie e cole este link no seu navegador:</p>
            <div class="link-box">${link}</div>
            <div class="warning">
              <strong>⚠️ Este link expira em 24 horas.</strong><br>
              Até a confirmação, a conta continua usando o e-mail anterior. Se você não pediu esta troca, ignore este e-mail.
            </div>
          </div>
          <div class="footer">
            <p><strong>MyExpenses</strong> - Gestão Financeira Pessoal</p>
            <p style="margin-top: 8px; font-size: 12px;">Este é um e-mail automático, por favor não responda.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Confirme seu novo e-mail - MyExpenses

Olá, ${name}!

Recebemos um pedido para usar este endereço na sua conta do MyExpenses.
Para confirmar a troca, acesse o link abaixo:
${link}

⚠️ Este link expira em 24 horas. Até a confirmação, a conta continua usando o e-mail anterior.

Se você não pediu esta troca, ignore este e-mail.

---
MyExpenses - Gestão Financeira Pessoal
  `;

  return sendEmailWithRetry({ to, subject: "📧 Confirme seu novo e-mail no MyExpenses", html, text });
}

/** Aviso ao endereço antigo depois da troca, para o dono perceber uma alteração que não fez. */
export async function sendEmailChangedNotice(to: string, name: string, novoEmail: string) {
  const nome = escaparHtml(name);
  const novo = escaparHtml(novoEmail);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Seu e-mail foi alterado</title>
        <style>${ESTILO_TROCA_EMAIL}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Seu e-mail foi alterado</h1>
            <p style="margin: 0; opacity: 0.9;">MyExpenses - Gestão Financeira</p>
          </div>
          <div class="content">
            <p style="font-size: 18px; margin-bottom: 16px;">Olá, <strong>${nome}</strong>!</p>
            <p style="margin-bottom: 16px;">O e-mail da sua conta do <strong>MyExpenses</strong> foi alterado para <strong>${novo}</strong>. Este endereço deixa de receber mensagens da conta.</p>
            <div class="warning">
              <strong>⚠️ Não foi você?</strong><br>
              Entre em contato pela página de contato do MyExpenses o quanto antes.
            </div>
          </div>
          <div class="footer">
            <p><strong>MyExpenses</strong> - Gestão Financeira Pessoal</p>
            <p style="margin-top: 8px; font-size: 12px;">Este é um e-mail automático, por favor não responda.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Seu e-mail foi alterado - MyExpenses

Olá, ${name}!

O e-mail da sua conta do MyExpenses foi alterado para ${novoEmail}.
Este endereço deixa de receber mensagens da conta.

⚠️ Não foi você? Entre em contato pela página de contato do MyExpenses o quanto antes.

---
MyExpenses - Gestão Financeira Pessoal
  `;

  return sendEmailWithRetry({ to, subject: "🔔 O e-mail da sua conta MyExpenses foi alterado", html, text });
}
