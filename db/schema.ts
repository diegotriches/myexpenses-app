import {
  pgTable, serial, varchar, text, integer, boolean, jsonb,
  uuid, numeric, timestamp, date, uniqueIndex, pgEnum
} from "drizzle-orm/pg-core";

// ========================================
// USUÁRIOS (Base para NextAuth)
// ========================================
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: 'date' }), // Para NextAuth
  image: text("image"),
  password: text("password"),
  preferencias: jsonb("preferencias").$type<{
    tema?: "light" | "dark" | "system";
    idioma?: string;
    moeda?: string;
    notificacoes?: boolean;
    notificacoesEmail?: boolean;
    formatoData?: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
    inicioSemana?: "domingo" | "segunda";
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabelas necessárias para NextAuth (OAuth com Google)
export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

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

// ========================================
// CATEGORIAS (Isoladas por usuário)
// ========================================
export const categorias = pgTable("categorias", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nome: varchar("nome", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // "entrada" ou "saida"
  icone: varchar("icone", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ========================================
// CONTAS (Isoladas por usuário)
// ========================================
export const contas = pgTable("contas", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nome: varchar("nome", { length: 150 }).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  observacoes: text("observacoes"),
  saldoInicial: numeric("saldo_inicial", { precision: 14, scale: 2 }).notNull(),
  saldoAtual: numeric("saldo_atual", { precision: 14, scale: 2 }).notNull(),
  banco: varchar("banco", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ========================================
// CARTÕES (Isolados por usuário)
// ========================================
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

// ========================================
// TRANSAÇÕES (Isoladas por usuário)
// ========================================
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
});

// ========================================
// FATURAS (Isoladas por usuário)
// ========================================
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

// ========================================
// EXTRATO (Isolado por usuário)
// ========================================
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

export const extratoConta = pgTable("extrato_conta", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
});