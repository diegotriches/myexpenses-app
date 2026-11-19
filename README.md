# MyExpenses

Aplicativo web de finanças pessoais: contas, cartões de crédito, lançamentos, investimentos e imposto de renda sobre renda variável, num só lugar. A interface é em português do Brasil, e os valores, em reais.

## Funcionalidades

- **Contas e extrato:** saldo por conta, extrato com saldo após cada lançamento, ajustes de saldo e transferências entre contas.
- **Lançamentos:** receitas e despesas à vista, parceladas ou recorrentes (geradas automaticamente todo mês), com categorias e estabelecimentos, filtro rápido por receitas e despesas e detalhes ao clicar no lançamento.
- **Cartões e faturas:** ciclo pelo dia de fechamento, limite disponível, pagamento e adiantamento de fatura, estorno de compras e antecipação de parcelas. Crédito de uma fatura fechada passa sozinho para a próxima.
- **Aplicações (renda fixa):** CDB e similares atrelados ao CDI ou à Selic, e Prefixado e IPCA+ sem cupom, do Tesouro ou de títulos privados (valor na curva, com o IPCA mensal do Banco Central). Cada aplicação tem o tipo do produto (CDB, LCI, LCA, CRI, CRA, debênture, Tesouro Direto...), que sugere a tributação e mostra se há garantia do FGC, com rendimento diário pelas taxas do Banco Central, IR regressivo por aporte e resgate automático no vencimento.
- **Renda variável:** ações, FIIs, ETFs e BDRs, com preço médio, day trade, eventos corporativos, proventos e cotações automáticas. Importa as planilhas da Área do Investidor da B3.
- **IR de renda variável:** apuração mensal, isenção de ações até R$ 20 mil, compensação de prejuízo, DARF com vencimento e bens e direitos para a declaração.
- **Dashboard:** próximos vencimentos, saldo previsto para o fim do mês, gastos do mês comparados à média, evolução do patrimônio (contas e investimentos) e resumo dos investimentos.
- **Resumo anual:** receitas, despesas e taxa de poupança comparadas ao ano anterior, categorias, formas de pagamento, investimentos no ano e dados para a declaração de IR, com exportação em PDF.
- **Conta do usuário:** login com Google ou e-mail e senha, notificações, opção de ocultar valores, backup automático e importação/exportação de todos os dados.
- **Interface:** tema claro e escuro (segue o sistema por padrão), layout para celular, tablet e telas grandes (até QHD) e transições suaves entre páginas, abas e janelas, que respeitam a opção de reduzir movimento do sistema.

## Stack

- [Next.js 16](https://nextjs.org) (App Router), React 19 e TypeScript
- [Neon](https://neon.tech) (PostgreSQL serverless) com [Drizzle ORM](https://orm.drizzle.team)
- [NextAuth v4](https://next-auth.js.org) com sessão JWT (Google e credenciais)
- Tailwind CSS v4, shadcn/ui, tw-animate-css, lucide-react e Recharts
- React Query v5 para os dados no navegador
- Vercel (hospedagem, crons e Blob para a foto de perfil), Gmail via Nodemailer para e-mails e [brapi.dev](https://brapi.dev) para cotações
- Vitest nos testes das regras de cálculo e GitHub Actions no CI

## Estrutura

Não há pasta `src`: o alias `@/` aponta para a raiz.

| Pasta | Conteúdo |
|---|---|
| `app/(dashboard)` | Páginas logadas |
| `app/(auth)` | Login, cadastro, recuperação de senha e confirmação de e-mail |
| `app/api` | Rotas da API (`route.ts`), inclusive os crons em `app/api/cron` |
| `db` | Schema do Drizzle (`schema.ts`) e conexão |
| `lib` | Lógica de servidor: movimentação de saldo, faturas, backup, e-mail |
| `utils` | Regras puras de cálculo (faturas, datas, aplicações, renda variável, IR, importadores) |
| `services` / `hooks` | Chamadas à API e hooks do React Query |
| `components` | Componentes por módulo; `components/ui` são os do shadcn/ui |
| `types` / `contexts` | Tipos compartilhados e estado global da interface |
| `sql` | Scripts de mudança de schema, rodados manualmente |

## Configuração local

### Pré-requisitos

- Node.js 20.9+ (exigido pelo Next.js 16)
- Conta no [Neon](https://neon.tech)
- Projeto no [Google Cloud Console](https://console.cloud.google.com) (login com Google)
- Conta Gmail com verificação em duas etapas (envio de e-mails)
- Conta na [brapi.dev](https://brapi.dev) (cotações)
- Conta na [Vercel](https://vercel.com) (produção e Blob da foto de perfil)

### 1. Clonar e instalar

```bash
git clone https://github.com/diegotriches/myexpenses-app.git
cd myexpenses-app
npm install
```

### 2. Banco de dados (Neon)

1. Em https://neon.tech, crie um projeto na região mais próxima.
2. Em **Connection Details**, copie a connection string. Ela precisa terminar com `?sslmode=require`:
   ```
   postgresql://user:pass@ep-xxx.neon.tech/myexpenses?sslmode=require
   ```

### 3. Login com Google

1. No Google Cloud Console, crie um projeto e configure a **OAuth consent screen** (User Type: External).
2. Em **APIs & Services → Credentials → Create Credentials → OAuth client ID**, escolha **Web application**.
3. Em **Authorized JavaScript origins**, cadastre `http://localhost:3000` e a URL de produção.
4. Em **Authorized redirect URIs**, cadastre:
   ```
   http://localhost:3000/api/auth/callback/google
   https://seu-app.vercel.app/api/auth/callback/google
   ```
5. Copie o **Client ID** e o **Client Secret**.

### 4. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha o `.env.local`. O `.env.example` explica como obter cada valor:

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Banco no Neon (com `?sslmode=require`) |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | Sessão e URL base do login |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Login com Google |
| `BLOB_READ_WRITE_TOKEN` | Foto de perfil (Vercel Blob) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | E-mails de verificação de cadastro, troca de e-mail, recuperação de senha e contato |
| `NEXT_PUBLIC_APP_URL` | URL pública gravada nos backups |
| `CRON_SECRET` | Autenticação das rotas `/api/cron/*` |
| `BRAPI_API_KEY` | Cotações de renda variável |

Para `NEXTAUTH_SECRET` e `CRON_SECRET`, gere valores aleatórios:

```bash
openssl rand -base64 32
```

⚠️ Escreva os valores **sem aspas** e não defina `NODE_ENV`: o Next cuida dela.

### 5. Criar as tabelas

Em um banco **novo e vazio**, crie as tabelas a partir de `db/schema.ts`:

```bash
npx drizzle-kit push
```

Em um banco que já tem dados, **não use** esse comando. Veja [Mudanças no banco](#mudanças-no-banco).

### 6. Rodar

```bash
npm run dev
```

Acesse http://localhost:3000, entre com o Google ou cadastre-se com e-mail e senha (é preciso confirmar o e-mail pelo link enviado).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run validate` | Checagem de tipos (`tsc --noEmit`) e lint (`eslint .`) |
| `npm run type-check` / `npm run lint` | Cada uma das checagens acima, separada |
| `npm test` | Testes das regras de cálculo (Vitest) |
| `npm run test:watch` | Testes em modo observação |
| `npm run pre-deploy` | `validate`, testes e build: rode antes de publicar |

## Testes e CI

Os testes ficam em `utils/__tests__` e `lib/__tests__` e cobrem as regras puras, sem banco: ciclo e vencimento de fatura, divisão de parcelas, calendário da B3, rendimento e IR de aplicações, preço médio e day trade, eventos corporativos, apuração de IR, DARF e os importadores das planilhas da B3. Rodam com o fuso UTC, como o servidor da Vercel.

O GitHub Actions (`.github/workflows/ci.yml`) roda `validate` e os testes a cada push e em cada Pull Request. Ele não acessa o banco nem precisa de segredos.

## Mudanças no banco

Não há migrations automáticas. Ao mudar o schema:

1. Atualize `db/schema.ts`.
2. Crie em `sql/` um script `AAAA-MM-DD-descricao.sql` idempotente (`IF NOT EXISTS`).
3. Rode o script no console do Neon **antes** do deploy do código que depende dele.

Para testar algo que grava dados, use uma branch do Neon, nunca o banco de produção.

## Deploy na Vercel

1. Em https://vercel.com, crie um projeto importando o repositório do GitHub.
2. Em **Settings → Environment Variables**, cadastre todas as variáveis da tabela acima, com os valores de produção:
   - `NEXTAUTH_URL` e `NEXT_PUBLIC_APP_URL` = `https://seu-app.vercel.app`
   - `CRON_SECRET` é obrigatória: sem ela, os crons respondem 401
3. Confira se o redirect URI de produção está cadastrado no Google Cloud Console.
4. Faça o deploy. Cada branch enviada ao GitHub gera um deploy de Preview.

### Crons

Definidos em `vercel.json` (horários em UTC). Depois do deploy, confira em **Settings → Cron Jobs** se todos aparecem: o plano da Vercel precisa permitir a quantidade.

| Rota | Horário (UTC) | O que faz |
|---|---|---|
| `/api/cron/backup` | `0 3 * * *` | Backup automático, conforme a preferência de cada usuário |
| `/api/cron/recorrencias` | `0 4 * * *` | Gera os lançamentos recorrentes do dia |
| `/api/cron/faturas` | `30 4 * * *` | Passa o crédito de fatura fechada para a próxima |
| `/api/cron/aplicacoes` | `0 5 * * *` | Recalcula as aplicações e resgata as vencidas |
| `/api/cron/cotacoes` | `30 21 * * 1-5` | Atualiza as cotações depois do pregão (18h30 em Brasília) |

## Problemas comuns

| Sintoma | O que conferir |
|---|---|
| "NEXTAUTH_SECRET missing" | A variável no `.env.local` e na Vercel |
| Falha de conexão com o banco | `?sslmode=require` no fim da `DATABASE_URL` |
| Login com Google não funciona | Redirect URIs no Google Cloud Console. Em URLs de Preview, o login com Google pode falhar porque elas não estão cadastradas |
| E-mails não chegam | `GMAIL_USER` e `GMAIL_APP_PASSWORD` (senha de app, não a senha da conta) |
| Sessão não persiste | Limpe os cookies e confira a `NEXTAUTH_URL` do ambiente. Trocar a `NEXTAUTH_SECRET` encerra todas as sessões |
| Cron responde 401 | `CRON_SECRET` definida na Vercel |
| Cotações não atualizam | `BRAPI_API_KEY` válida e dentro do limite do plano da brapi |

## Documentação externa

- [Next.js](https://nextjs.org/docs)
- [NextAuth](https://next-auth.js.org)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Neon](https://neon.tech/docs)
- [Vercel](https://vercel.com/docs)
