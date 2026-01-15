// src/db/schema.ts
import {
  pgTable, serial, varchar, text, integer, boolean, jsonb,
  uuid, numeric, timestamp, date, uniqueIndex, pgEnum, index
} from "drizzle-orm/pg-core";

// TABELA: users

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: 'date' }),
  image: text("image"),
  password: text("password"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry", { mode: 'date' }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
}));

// TABELA: preferences

export const preferences = pgTable("preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(), // Um usuário tem apenas uma preferência
  
  // Configurações de aparência
  tema: text("tema").$type<"light" | "dark" | "system">().default("system"),
  idioma: text("idioma").default("pt-BR"),
  
  // Configurações regionais
  moeda: text("moeda").default("BRL"),
  formatoData: text("formato_data").$type<"DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD">().default("DD/MM/YYYY"),
  inicioSemana: text("inicio_semana").$type<"domingo" | "segunda">().default("domingo"),
  
  // Configurações de notificações
  notificacoes: boolean("notificacoes").default(true),
  notificacoesEmail: boolean("notificacoes_email").default(false),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("preferences_user_id_idx").on(table.userId),
}));

// TYPES (para inferência TypeScript)

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Preference = typeof preferences.$inferSelect;
export type NewPreference = typeof preferences.$inferInsert;

// 🔐 TABELA: accounts (NextAuth OAuth)

/**
 * Armazena contas OAuth vinculadas aos usuários
 * 
 * Providers suportados:
 * - Google OAuth (provider: "google")
 * - Outros providers podem ser adicionados no futuro
 * 
 * Índices:
 * - provider + providerAccountId (UNIQUE) - Garante 1 conta por provider
 * - userId - Performance em queries de lookup
 */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "oauth" | "email" | "credentials"
    provider: text("provider").notNull(), // "google", "github", etc
    providerAccountId: text("providerAccountId").notNull(), // ID do usuário no provider
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"), // Timestamp de expiração do access_token
    token_type: text("token_type"), // "Bearer"
    scope: text("scope"), // Escopos concedidos (ex: "openid email profile")
    id_token: text("id_token"), // JWT token do provider
    session_state: text("session_state"), // Estado da sessão OAuth
  },
  (table) => ({
    // 📊 ÍNDICES DE PERFORMANCE
    
    /**
     * Índice composto UNIQUE (provider + providerAccountId)
     * 
     * Garante que:
     * - Cada conta OAuth é única (não pode vincular 2x)
     * - Queries por provider são rápidas
     * 
     * Usado em:
     * - getUserByAccount() no adapter
     * - Lookup de contas OAuth durante login
     */
    providerAccountIdx: uniqueIndex("accounts_provider_account_idx").on(
      table.provider,
      table.providerAccountId
    ),
    
    /**
     * Índice em userId
     * 
     * Usado em:
     * - Buscar todas as contas de um usuário
     * - Queries de vinculação/desvinculação
     */
    userIdIdx: uniqueIndex("accounts_user_id_idx").on(table.userId),
  })
);

// 💡 EXPLICAÇÃO DOS CAMPOS OAUTH

/*
📋 CAMPOS OBRIGATÓRIOS:
- id: UUID único da conta
- userId: Referência ao usuário (cascade delete)
- type: Tipo de autenticação ("oauth")
- provider: Nome do provider ("google")
- providerAccountId: ID do usuário no Google (sub do JWT)

🔑 TOKENS (OAuth 2.0):
- access_token: Token de acesso à API do provider
  * Expira em 1 hora (Google)
  * Usado para acessar recursos (email, profile, etc)
  
- refresh_token: Token de renovação (long-lived)
  * Nunca expira (Google - pode ser revogado)
  * Usado para obter novos access_tokens
  * ⚠️ CRÍTICO: Guardar com segurança
  
- expires_at: Timestamp de expiração do access_token
  * Formato: Unix timestamp (segundos)
  * Usado para saber quando renovar
  
- id_token: JWT do provider com dados do usuário
  * Contém: email, name, picture, sub
  * Verificado pelo NextAuth automaticamente

📊 METADATA:
- token_type: Sempre "Bearer" (OAuth 2.0)
- scope: Permissões concedidas
  * Exemplo Google: "openid email profile"
- session_state: Estado da sessão OAuth (OIDC)

🔗 RELACIONAMENTOS:
- 1 usuário pode ter múltiplas contas (Google + GitHub + etc)
- 1 conta pertence a exatamente 1 usuário
- Cascade delete: Remove contas ao deletar usuário

⚡ PERFORMANCE:
- Índice composto (provider + providerAccountId):
  * O(1) lookup durante login OAuth
  * Previne contas duplicadas
  
- Índice em userId:
  * Rápido para buscar todas as contas de um usuário
  * Usado em páginas de perfil/configurações
*/

// 📚 EXEMPLO DE DADOS

/*
Exemplo de registro após login com Google:

{
  id: "550e8400-e29b-41d4-a716-446655440000",
  userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  type: "oauth",
  provider: "google",
  providerAccountId: "123456789012345678901", // Google user ID (sub)
  refresh_token: "1//0gT5R...", // Usado para renovar access_token
  access_token: "ya29.a0AfH6SM...", // Expira em 1h
  expires_at: 1736780400, // Unix timestamp
  token_type: "Bearer",
  scope: "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
  id_token: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjI3M...", // JWT com dados do usuário
  session_state: null, // Usado por alguns providers (não Google)
}
*/

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: text("sessionToken").notNull().unique(),
  userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { mode: 'date' }).notNull(),
}, (vt) => ({
  compoundKey: uniqueIndex("verification_tokens_identifier_token_idx").on(vt.identifier, vt.token),
}));

// CATEGORIAS (Isoladas por usuário)

 /*Enum para tipos de categoria*/
export const tipoCategoriaEnum = pgEnum("tipo_categoria", ["entrada", "saida", "ambos"]);

/*Tabela de categorias*/
export const categorias = pgTable("categorias", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nome: varchar("nome", { length: 100 }).notNull(),
  tipo: tipoCategoriaEnum("tipo").notNull(),
  icone: varchar("icone", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Índices para performance
  userTipoIdx: index("idx_categorias_user_tipo").on(table.userId, table.tipo),
  nomeIdx: index("idx_categorias_nome").on(table.nome),
}));

/**
 * Tipos inferidos do schema
 */
export type CategoriaDb = typeof categorias.$inferSelect;
export type NovaCategoriaDb = typeof categorias.$inferInsert;

// CONTAS (Isoladas por usuário)

export const contas = pgTable(
  "contas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nome: varchar("nome", { length: 150 }).notNull(),
    ativo: boolean("ativo").default(true).notNull(),
    observacoes: text("observacoes"),
    saldoInicial: numeric("saldo_inicial", { precision: 14, scale: 2 }).notNull(),
    saldoAtual: numeric("saldo_atual", { precision: 14, scale: 2 }).notNull(),
    banco: varchar("banco", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("contas_user_id_idx").on(table.userId),
  })
);

// CARTÕES (Isolados por usuário)

export const cartaoTipoEnum = pgEnum("cartao_tipo", [
  "credito",
  "debito",
]);

export const cartoes = pgTable("cartoes", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(),
  bandeira: text("bandeira").notNull(),
  empresa: text("empresa").notNull(),
  limite: numeric("limite", { precision: 14, scale: 2 }).notNull(),
  limiteDisponivel: numeric("limite_disponivel", { precision: 14, scale: 2 }).notNull(),
  diaFechamento: integer("dia_fechamento"),
  diaVencimento: integer("dia_vencimento"),
  ativo: boolean("ativo").default(true).notNull(),
  observacoes: text("observacoes"),
  contaVinculadaId: uuid("conta_vinculada_id").references(() => contas.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// TRANSAÇÕES (Isoladas por usuário)

export const transacoes = pgTable("transacoes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  data: timestamp("data", { withTimezone: true }).notNull(),
  tipo: text("tipo").notNull(),
  descricao: text("descricao"),
  valor: numeric("valor", { precision: 14, scale: 2 }).notNull(),
  categoria: text("categoria"),
  formaPagamento: text("formaPagamento"),
  contaId: uuid("conta_id").references(() => contas.id),
  transferenciaId: uuid("transferencia_id"),
  cartaoId: integer("cartaoId").references(() => cartoes.id),
  recorrente: boolean("recorrente").default(false),
  recorrenciaId: varchar("recorrenciaId", { length: 36 }),
  repeticoes: integer("repeticoes"),
  parcelado: boolean("parcelado").default(false),
  parcelamentoId: varchar("parcelamentoId", { length: 36 }),
  parcelas: integer("parcelas"),
  parcelaAtual: integer("parcelaAtual"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 📊 ÍNDICES RECOMENDADOS (V2)

// Para melhor performance em queries frequentes:
//
// CREATE INDEX idx_transacoes_user_data ON transacoes(user_id, data DESC);
// CREATE INDEX idx_transacoes_conta_data ON transacoes(conta_id, data DESC);
// CREATE INDEX idx_transacoes_cartao_data ON transacoes(cartao_id, data DESC);
// CREATE INDEX idx_transacoes_parcelamento ON transacoes(parcelamento_id) WHERE parcelamento_id IS NOT NULL;
// CREATE INDEX idx_transacoes_recorrencia ON transacoes(recorrencia_id) WHERE recorrencia_id IS NOT NULL;
//
// ========================================

// FATURAS (Isoladas por usuário)

export const faturas = pgTable("faturas", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cartaoId: integer("cartao_id")
    .notNull()
    .references(() => cartoes.id, { onDelete: "cascade" }),
  mes: integer("mes").notNull(),
  ano: integer("ano").notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  paga: boolean("paga").notNull().default(false),
  dataPagamento: date("data_pagamento"),
  contaPagamentoId: uuid("conta_pagamento_id").references(
    () => contas.id
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
},
  (table) => ({
    faturaUnica: uniqueIndex("faturas_cartao_mes_ano_idx").on(
      table.cartaoId,
      table.mes,
      table.ano
    ),
  })
);

// EXTRATO (Isolado por usuário)

export const extratoTipoEnum = pgEnum("extrato_tipo", [
  "entrada",
  "saida",
]);

export const extratoOrigemEnum = pgEnum("extrato_origem", [
  "TRANSACAO_MANUAL",
  "PAGAMENTO_FATURA",
  "TRANSFERENCIA",
  "AJUSTE",
  "ESTORNO",
]);

export const extratoConta = pgTable(
  "extrato_conta",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contaId: uuid("conta_id")
      .notNull()
      .references(() => contas.id, { onDelete: "cascade" }),
    data: date("data").notNull(),
    tipo: extratoTipoEnum("tipo").notNull(),
    valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
    descricao: text("descricao").notNull(),
    saldoApos: numeric("saldo_apos", { precision: 12, scale: 2 }).notNull(),
    origem: extratoOrigemEnum("origem").notNull(),
    referenciaId: varchar("referencia_id", { length: 36 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userContaDataIdx: index("extrato_conta_user_conta_data_idx")
      .on(table.userId, table.contaId, table.data.desc()),
    
    referenciaIdx: index("extrato_conta_referencia_idx")
      .on(table.referenciaId),
  })
);

// TRANSFERÊNCIAS (Isolado por usuário)

export const transferencias = pgTable(
  "transferencias",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contaOrigemId: uuid("conta_origem_id")
      .notNull()
      .references(() => contas.id, { onDelete: "cascade" }),
    contaDestinoId: uuid("conta_destino_id")
      .notNull()
      .references(() => contas.id, { onDelete: "cascade" }),
    valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
    data: date("data").notNull(),
    descricao: text("descricao"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("transferencias_user_id_idx").on(table.userId),
    contaOrigemIdx: index("transferencias_origem_idx").on(table.contaOrigemId),
    contaDestinoIdx: index("transferencias_destino_idx").on(table.contaDestinoId),
    dataIdx: index("transferencias_data_idx").on(table.data.desc()),
  })
);

// NOTIFICAÇÕES (Isolado por usuário)

export const notificacoes = pgTable("notificacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  severidade: text("severidade").notNull(),
  titulo: text("titulo").notNull(),
  mensagem: text("mensagem").notNull(),
  lida: boolean("lida").notNull().default(false),
  link: text("link"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const preferenciasNotificacao = pgTable("preferencias_notificacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  faturas: boolean("faturas").notNull().default(true),
  limiteCartao: boolean("limite_cartao").notNull().default(true),
  saldoBaixo: boolean("saldo_baixo").notNull().default(true),
  transacoesAltas: boolean("transacoes_altas").notNull().default(false),
  emailNotificacoes: boolean("email_notificacoes").notNull().default(false),
  diasAntesVencimento: integer("dias_antes_vencimento").notNull().default(3),
  limiteMinimoConta: integer("limite_minimo_conta").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});