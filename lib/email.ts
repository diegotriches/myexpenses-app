// src/lib/email.ts

import { Resend } from 'resend';

// ========================================
// VALIDAÇÕES E INICIALIZAÇÃO
// ========================================

// Validar RESEND_API_KEY
if (!process.env.RESEND_API_KEY) {
  console.error('❌ [EMAIL] RESEND_API_KEY não está definida no .env');
  throw new Error(
    '❌ RESEND_API_KEY não está definida.\n' +
    'Configure a variável RESEND_API_KEY no arquivo .env\n' +
    'Obtenha sua chave em: https://resend.com/api-keys'
  );
}

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Log de inicialização
if (process.env.NODE_ENV === 'development') {
  console.log('✅ [EMAIL] Resend inicializado com sucesso');
}

// ========================================
// CONFIGURAÇÕES DE EMAIL
// ========================================

const EMAIL_FROM = process.env.EMAIL_FROM || 'MyExpenses <noreply@onboarding.resend.dev>';
const APP_NAME = 'MyExpenses';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

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

/**
 * Valida se um email está em formato correto
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Verifica rate limit para um email
 */
function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const lastSent = emailRateLimit.get(email) || 0;
  
  // Limpar rate limits antigos
  if (now - lastSent > RATE_LIMIT_WINDOW) {
    emailRateLimit.delete(email);
    return true;
  }
  
  // Verificar se ultrapassou o limite
  const count = emailRateLimit.get(`${email}_count`) || 0;
  if (count >= MAX_EMAILS_PER_WINDOW) {
    console.warn(`⚠️ [EMAIL] Rate limit atingido para: ${email}`);
    return false;
  }
  
  return true;
}

/**
 * Atualiza contador de rate limit
 */
function updateRateLimit(email: string) {
  const now = Date.now();
  const count = (emailRateLimit.get(`${email}_count`) || 0) + 1;
  
  emailRateLimit.set(email, now);
  emailRateLimit.set(`${email}_count`, count);
  
  // Limpar depois do window
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
  text 
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    // Validar email
    if (!isValidEmail(to)) {
      console.error('❌ [EMAIL] Email inválido:', to);
      throw new Error('Email inválido');
    }
    
    // Verificar rate limit
    if (!checkRateLimit(to)) {
      throw new Error('Rate limit atingido. Tente novamente em alguns minutos.');
    }
    
    console.log('📧 [EMAIL] Enviando email para:', to);
    console.log('📧 [EMAIL] Assunto:', subject);

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
      text: text || undefined,
    });

    if (error) {
      console.error('❌ [EMAIL] Erro ao enviar:', error);
      throw new Error(error.message || 'Erro ao enviar email');
    }

    // Atualizar rate limit
    updateRateLimit(to);
    
    console.log('✅ [EMAIL] Enviado com sucesso:', data?.id);
    return { success: true, id: data?.id };

  } catch (error: any) {
    console.error('❌ [EMAIL] Erro:', error);
    return { 
      success: false, 
      error: error.message || 'Erro desconhecido' 
    };
  }
}

/**
 * Versão com retry automático
 */
export async function sendEmailWithRetry(
  params: SendEmailParams,
  maxRetries: number = 3
): Promise<SendEmailResult> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendEmail(params);
      
      if (result.success) {
        return result;
      }
      
      lastError = new Error(result.error);
      
      // Não fazer retry em erros de validação
      if (result.error?.includes('inválido') || result.error?.includes('Rate limit')) {
        throw lastError;
      }
      
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // 1s, 2s, 3s
        console.warn(`⚠️ [EMAIL] Tentativa ${attempt} falhou. Tentando novamente em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
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

/**
 * Template: Email de Recuperação de Senha
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string
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
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
          }
          .content {
            padding: 40px 30px;
            background: #ffffff;
          }
          .content p {
            margin-bottom: 20px;
            color: #555;
          }
          .button {
            display: inline-block;
            padding: 16px 32px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            transition: background 0.3s;
          }
          .button:hover {
            background: #5568d3;
          }
          .link-box {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
            word-break: break-all;
            font-size: 14px;
            color: #666;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .warning p {
            margin: 0;
            color: #856404;
          }
          .footer {
            background: #f9f9f9;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
          }
          .footer p {
            margin: 5px 0;
            color: #888;
            font-size: 14px;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
          .divider {
            height: 1px;
            background: #e0e0e0;
            margin: 30px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Recuperação de Senha</h1>
            <p style="margin: 0; opacity: 0.9;">MyExpenses - Gestão Financeira</p>
          </div>

          <div class="content">
            <p style="font-size: 18px; margin-bottom: 10px;">
              Olá, <strong>${name || 'Usuário'}</strong>!
            </p>

            <p>
              Recebemos uma solicitação para redefinir a senha da sua conta no <strong>${APP_NAME}</strong>.
            </p>

            <p>
              Para criar uma nova senha, clique no botão abaixo:
            </p>

            <div style="text-align: center;">
              <a href="${resetLink}" class="button">
                Redefinir Minha Senha
              </a>
            </div>

            <p style="font-size: 14px; color: #888;">
              Ou copie e cole este link no seu navegador:
            </p>
            <div class="link-box">
              ${resetLink}
            </div>

            <div class="divider"></div>

            <div class="warning">
              <p>
                <strong>⚠️ Este link expira em 1 hora.</strong>
              </p>
            </div>

            <p style="font-size: 14px; color: #888; margin-top: 30px;">
              Se você <strong>não solicitou</strong> esta recuperação de senha, 
              ignore este email. Sua senha permanecerá segura e inalterada.
            </p>
          </div>

          <div class="footer">
            <p><strong>${APP_NAME}</strong></p>
            <p>Gestão Financeira Pessoal</p>
            <div style="margin: 15px 0;">
              <a href="${APP_URL}">Acessar ${APP_NAME}</a>
            </div>
            <p style="font-size: 12px; color: #aaa; margin-top: 20px;">
              Este é um email automático, por favor não responda.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Recuperação de Senha - ${APP_NAME}

Olá, ${name || 'Usuário'}!

Recebemos uma solicitação para redefinir a senha da sua conta no ${APP_NAME}.

Para criar uma nova senha, acesse o link abaixo:
${resetLink}

⚠️ Este link expira em 1 hora.

Se você não solicitou esta recuperação de senha, ignore este email.

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

/**
 * Template: Confirmação de Senha Alterada
 */
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
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .content {
            padding: 40px 30px;
          }
          .success-icon {
            text-align: center;
            font-size: 60px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 16px 32px;
            background: #52c41a;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
          .alert {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            color: #856404;
          }
          .footer {
            background: #f9f9f9;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #888;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Senha Alterada com Sucesso</h1>
          </div>

          <div class="content">
            <div class="success-icon">✅</div>

            <p style="font-size: 18px;">
              Olá, <strong>${name || 'Usuário'}</strong>!
            </p>

            <p>
              Sua senha foi <strong>alterada com sucesso</strong>. 
              Você já pode fazer login com sua nova senha.
            </p>

            <div style="text-align: center;">
              <a href="${APP_URL}/login" class="button">
                Fazer Login
              </a>
            </div>

            <div class="alert">
              <p>
                <strong>⚠️ Você não fez esta alteração?</strong>
                Entre em contato com nosso suporte imediatamente.
              </p>
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

Olá, ${name || 'Usuário'}!

Sua senha foi alterada com sucesso. Você já pode fazer login com sua nova senha.

Fazer login: ${APP_URL}/login

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

/**
 * Template: Email de Verificação (novo)
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationToken: string
) {
  const verificationLink = `${APP_URL}/verify-email?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifique seu Email</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .content { padding: 40px 30px; }
          .button {
            display: inline-block;
            padding: 16px 32px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
          .link-box {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
            word-break: break-all;
            font-size: 14px;
            color: #666;
          }
          .footer {
            background: #f9f9f9;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #888;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Verifique seu Email</h1>
          </div>

          <div class="content">
            <p style="font-size: 18px;">
              Olá, <strong>${name}</strong>!
            </p>

            <p>
              Obrigado por se cadastrar no <strong>${APP_NAME}</strong>! 
              Para começar a usar sua conta, precisamos verificar seu email.
            </p>

            <div style="text-align: center;">
              <a href="${verificationLink}" class="button">
                Verificar Meu Email
              </a>
            </div>

            <p style="font-size: 14px; color: #888;">
              Ou copie e cole este link no seu navegador:
            </p>
            <div class="link-box">
              ${verificationLink}
            </div>

            <p style="font-size: 14px; color: #888; margin-top: 30px;">
              Este link expira em 24 horas.
            </p>
          </div>

          <div class="footer">
            <p><strong>${APP_NAME}</strong> - Gestão Financeira Pessoal</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Verifique seu Email - ${APP_NAME}

Olá, ${name}!

Obrigado por se cadastrar no ${APP_NAME}!

Para verificar seu email, acesse:
${verificationLink}

Este link expira em 24 horas.

---
${APP_NAME} - Gestão Financeira Pessoal
  `;

  return sendEmailWithRetry({
    to,
    subject: `📧 Verifique seu Email - ${APP_NAME}`,
    html,
    text,
  });
}

/**
 * Template: Email de Boas-Vindas
 */
export async function sendWelcomeEmail(to: string, name: string) {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao ${APP_NAME}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .content { padding: 40px 30px; }
          .button {
            display: inline-block;
            padding: 16px 32px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
          .feature {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 4px solid #667eea;
          }
          .footer {
            background: #f9f9f9;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #888;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bem-vindo ao ${APP_NAME}!</h1>
          </div>

          <div class="content">
            <p style="font-size: 18px;">
              Olá, <strong>${name}</strong>!
            </p>

            <p>
              Estamos muito felizes em ter você conosco! 🎊
            </p>

            <p>
              O <strong>${APP_NAME}</strong> é seu assistente pessoal para gestão financeira. 
              Com ele, você pode:
            </p>

            <div class="feature">
              <strong>💰 Controlar suas finanças</strong><br>
              Registre receitas e despesas facilmente
            </div>

            <div class="feature">
              <strong>📊 Visualizar relatórios</strong><br>
              Acompanhe seus gastos com gráficos intuitivos
            </div>

            <div class="feature">
              <strong>🎯 Atingir suas metas</strong><br>
              Defina objetivos e acompanhe seu progresso
            </div>

            <div style="text-align: center;">
              <a href="${APP_URL}/dashboard" class="button">
                Começar Agora
              </a>
            </div>
          </div>

          <div class="footer">
            <p><strong>${APP_NAME}</strong> - Gestão Financeira Pessoal</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmailWithRetry({
    to,
    subject: `🎉 Bem-vindo ao ${APP_NAME}!`,
    html,
  });
}