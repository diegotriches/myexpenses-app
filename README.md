# 🚀 MyExpenses - Guia de Configuração

Este guia ajuda você a configurar o MyExpenses do zero.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no [Neon](https://neon.tech) (PostgreSQL serverless)
- Conta no [Google Cloud Console](https://console.cloud.google.com)
- Conta na [Vercel](https://vercel.com) (para produção)

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

### 4.2. Habilitar Google+ API

1. Menu lateral → **"APIs & Services"** → **"Library"**
2. Busque: `Google+ API`
3. Clique em **"Enable"**

### 4.3. Criar Credenciais OAuth

1. Menu lateral → **"APIs & Services"** → **"Credentials"**
2. Clique em **"Create Credentials"** → **"OAuth client ID"**
3. Se aparecer aviso, configure a **OAuth consent screen**:
   - User Type: **External**
   - App name: `MyExpenses`
   - User support email: seu email
   - Developer contact: seu email
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

## 🔑 Passo 5: Gerar NEXTAUTH_SECRET

Execute no terminal:

```bash
openssl rand -base64 32
```

Ou acesse: https://generate-secret.vercel.app/32

---

## 📝 Passo 6: Criar .env.local

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env.local
   ```

2. Abra `.env.local` e preencha:

```bash
# Database
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/myexpenses?sslmode=require

# NextAuth
NEXTAUTH_SECRET=sua-chave-gerada-com-openssl-aqui
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=123456-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijk

# Vercel Blob (opcional por enquanto)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx

# Ambiente
NODE_ENV=development
```

⚠️ **IMPORTANTE**: Valores **SEM ASPAS**!

---

## 🗃️ Passo 7: Criar Tabelas no Banco

```bash
npm run db:push
```

Este comando cria todas as tabelas necessárias no PostgreSQL.

---

## ▶️ Passo 8: Rodar o Projeto

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## ✅ Passo 9: Testar

1. Clique em **"Login"**
2. Escolha **"Login com Google"**
3. Autorize o app
4. Você deve ser redirecionado para o dashboard ✅

---

## 🚀 Deploy na Vercel

### 1. Conectar Repositório

1. Acesse: https://vercel.com
2. Clique em **"New Project"**
3. Importe seu repositório do GitHub

### 2. Configurar Variáveis de Ambiente

Na seção **"Environment Variables"**, adicione:

```
DATABASE_URL = [sua connection string do Neon]
NEXTAUTH_SECRET = [a MESMA chave do .env.local]
NEXTAUTH_URL = https://seu-app.vercel.app
GOOGLE_CLIENT_ID = [seu client id]
GOOGLE_CLIENT_SECRET = [seu client secret]
BLOB_READ_WRITE_TOKEN = [seu token da Vercel Blob]
```

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

---

## 🐛 Troubleshooting

### Erro: "NEXTAUTH_SECRET missing"

**Solução**: Verifique se adicionou a variável no `.env.local` e na Vercel.

### Erro: "Database connection failed"

**Solução**: Verifique se adicionou `?sslmode=require` no final da DATABASE_URL.

### Erro: "Google OAuth não funciona"

**Solução**: Verifique os Redirect URIs no Google Console.

### Sessão não persiste

**Solução**: 
1. Limpe cookies do navegador
2. Verifique se NEXTAUTH_SECRET é o mesmo em dev e prod
3. Verifique se NEXTAUTH_URL está correto

---

## 📚 Próximos Passos

- [ ] Configurar Vercel Blob para upload de fotos
- [ ] Convidar usuários beta
- [ ] Configurar domínio customizado
- [ ] Habilitar Analytics

---

## 🆘 Ajuda

Se tiver problemas, verifique:

- [Documentação Next.js](https://nextjs.org/docs)
- [Documentação NextAuth](https://next-auth.js.org)
- [Documentação Neon](https://neon.tech/docs)
- [Documentação Vercel](https://vercel.com/docs)

Ou abra uma issue no repositório!