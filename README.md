# 🚀 MyExpenses - Guia de Configuração

Este guia ajuda você a configurar o MyExpenses do zero.

## 📋 Pré-requisitos

- Node.js 20.9+ instalado (exigido pelo Next.js 16)
- Conta no [Neon](https://neon.tech) (PostgreSQL serverless)
- Conta no [Google Cloud Console](https://console.cloud.google.com)
- Conta Gmail com verificação em duas etapas (envio de e-mails)
- Conta na [Vercel](https://vercel.com) (para produção)
- Conta na [brapi.dev](https://brapi.dev) (cotações de renda variável)

---

## 🔧 Passo 1: Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/myexpenses.git
cd myexpenses
```

---

## 📦 Passo 2: Instalar Dependências

```bash
npm install
```

---

## 🗄️ Passo 3: Configurar Banco de Dados (Neon)

### 3.1. Criar Projeto no Neon

1. Acesse: https://neon.tech
2. Clique em **"Create Project"**
3. Escolha um nome (ex: myexpenses)
4. Selecione região mais próxima

### 3.2. Obter Connection String

1. No dashboard do projeto, clique em **"Connection Details"**
2. Copie a **Connection String**
3. Deve ser algo como:
   ```
   postgresql://user:pass@ep-xxx.neon.tech/myexpenses
   ```

### 3.3. Adicionar SSL Mode

⚠️ **IMPORTANTE**: Adicione `?sslmode=require` no final:
```
postgresql://user:pass@ep-xxx.neon.tech/myexpenses?sslmode=require
```

---

## 🔐 Passo 4: Configurar Google OAuth

### 4.1. Criar Projeto no Google Cloud

1. Acesse: https://console.cloud.google.com
2. Clique em **"Select a project"** → **"New Project"**
3. Nome: `MyExpenses`
4. Clique em **"Create"**

### 4.2. Criar Credenciais OAuth

1. Menu lateral → **"APIs & Services"** → **"Credentials"**
2. Clique em **"Create Credentials"** → **"OAuth client ID"**
3. Se aparecer aviso, configure a **OAuth consent screen**:
   - User Type: **External**
   - App name: `MyExpenses`
   - User support email: seu e-mail
   - Developer contact: seu e-mail
   - Salve e continue

4. Volte para **"Create OAuth client ID"**:
   - Application type: **Web application**
   - Name: `MyExpenses Web Client`

5. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://seu-app.vercel.app
   ```

6. **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   https://seu-app.vercel.app/api/auth/callback/google
   ```

7. Clique em **"Create"**

8. Copie o **Client ID** e **Client Secret**

---

## 🔑 Passo 5: Gerar os segredos

Gere um valor para `NEXTAUTH_SECRET` e outro para `CRON_SECRET`:

```bash
openssl rand -base64 32
```

---

## 📝 Passo 6: Criar .env.local

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env.local
   ```

2. Abra `.env.local` e preencha cada variável. O `.env.example` explica como obter cada uma:

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Banco no Neon (com `?sslmode=require`) |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | Sessão e URL base do login |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Login com Google |
| `BLOB_READ_WRITE_TOKEN` | Foto de perfil (Vercel Blob) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | E-mails de verificação, recuperação de senha e contato |
| `NEXT_PUBLIC_APP_URL` | URL pública gravada nos backups |
| `CRON_SECRET` | Autenticação das rotas `/api/cron/*` |
| `BRAPI_API_KEY` | Cotações de renda variável |

⚠️ **IMPORTANTE**: Valores **SEM ASPAS**! Não defina `NODE_ENV`: o Next cuida dela.

---

## 🗃️ Passo 7: Criar Tabelas no Banco

Em um banco **novo e vazio**, crie as tabelas a partir de `db/schema.ts`:

```bash
npx drizzle-kit push
```

Em um banco que já tem dados, **não use** esse comando: mudanças de schema são aplicadas com os scripts SQL da pasta `sql/` (`AAAA-MM-DD-descricao.sql`), rodados manualmente no console do Neon antes do deploy.

---

## ▶️ Passo 8: Rodar o Projeto

```bash
npm run dev
```

Acesse: http://localhost:3000

Antes de publicar, rode `npm run pre-deploy` (checagem de tipos, lint e build).

---

## ✅ Passo 9: Testar

1. Clique em **"Login"**
2. Escolha **"Login com Google"**, ou cadastre-se com e-mail e senha (é preciso confirmar o e-mail)
3. Você deve ser redirecionado para o dashboard ✅

---

## 🚀 Deploy na Vercel

### 1. Conectar Repositório

1. Acesse: https://vercel.com
2. Clique em **"New Project"**
3. Importe seu repositório do GitHub

### 2. Configurar Variáveis de Ambiente

Em **Settings → Environment Variables**, cadastre todas as variáveis da tabela do Passo 6, com os valores de produção:

- `NEXTAUTH_URL` e `NEXT_PUBLIC_APP_URL` = `https://seu-app.vercel.app`
- `CRON_SECRET` é obrigatória: sem ela, todos os crons respondem 401

⚠️ Valores **SEM ASPAS**!

### 3. Atualizar Redirect URIs no Google

1. Volte ao Google Cloud Console
2. Edite suas credenciais OAuth
3. Adicione o redirect URI de produção:
   ```
   https://seu-app.vercel.app/api/auth/callback/google
   ```

### 4. Deploy

Clique em **"Deploy"** e aguarde!

Os crons (backup, recorrências, aplicações e cotações) são definidos em `vercel.json` e passam a rodar após o deploy.

---

## 🐛 Troubleshooting

### Erro: "NEXTAUTH_SECRET missing"

**Solução**: Verifique se adicionou a variável no `.env.local` e na Vercel.

### Erro: "Database connection failed"

**Solução**: Verifique se adicionou `?sslmode=require` no final da DATABASE_URL.

### Erro: "Google OAuth não funciona"

**Solução**: Verifique os Redirect URIs no Google Console.

### E-mails não chegam

**Solução**: Confira `GMAIL_USER` e `GMAIL_APP_PASSWORD` (senha de app, não a senha da conta).

### Sessão não persiste

**Solução**:
1. Limpe cookies do navegador
2. Verifique se NEXTAUTH_URL está correto para o ambiente
3. Lembre que trocar a NEXTAUTH_SECRET encerra todas as sessões abertas

---

## 🆘 Ajuda

Se tiver problemas, verifique:

- [Documentação Next.js](https://nextjs.org/docs)
- [Documentação NextAuth](https://next-auth.js.org)
- [Documentação Neon](https://neon.tech/docs)
- [Documentação Vercel](https://vercel.com/docs)

Ou abra uma issue no repositório!
