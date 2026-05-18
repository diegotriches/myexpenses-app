// src/db/schema.ts
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  uuid,
  numeric,
  timestamp,
  date,
  uniqueIndex,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

// TABELA: users
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    password: text("password"),
    resetToken: text("reset_token"),
    resetTokenExpiry: timestamp("reset_token_expiry", { mode: "date" }),
    role: userRoleEnum("role").default("user").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
  }),
);

// TABELA: preferences

export const preferences = pgTable(
  "preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    tema: text("tema").$type<"light" | "dark" | "system">().default("system"),
    idioma: text("idioma").default("pt-BR"),
    moeda: text("moeda").default("BRL"),
    formatoData: text("formato_data")
      .$type<"DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD">()
      .default("DD/MM/YYYY"),
    inicioSemana: text("inicio_semana")
      .$type<"domingo" | "segunda">()
      .default("domingo"),
    notificacoes: boolean("notificacoes").default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("preferences_user_id_idx").on(table.userId),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Preference = typeof preferences.$inferSelect;
export type NewPreference = typeof preferences.$inferInsert;

// 🔐 TABELA: accounts (NextAuth OAuth)

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    // index simples — uniqueIndex impedia recriar conta Google após exclusão
    userIdIdx: index("accounts_user_id_idx").on(table.userId),
    providerAccountIdx: uniqueIndex("accounts_provider_account_idx").on(
      table.provider,
      table.providerAccountId,
    ),
  }),
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: text("sessionToken").notNull().unique(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: uniqueIndex("verification_tokens_identifier_token_idx").on(
      vt.identifier,
      vt.token,
    ),
  }),
);

// CATEGORIAS (Isoladas por usuário)

export const tipoCategoriaEnum = pgEnum("tipo_categoria", [
  "entrada",
  "saida",
  "ambos",
]);

export const categorias = pgTable(
  "categorias",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nome: varchar("nome", { length: 100 }).notNull(),
    tipo: tipoCategoriaEnum("tipo").notNull(),
    icone: varchar("icone", { length: 50 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userTipoIdx: index("idx_categorias_user_tipo").on(table.userId, table.tipo),
    nomeIdx: index("idx_categorias_nome").on(table.nome),
  }),
);

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
    saldoInicial: numeric("saldo_inicial", {
      precision: 14,
      scale: 2,
    }).notNull(),
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
  }),
);

// CARTÕES (Isolados por usuário)

export const cartaoTipoEnum = pgEnum("cartao_tipo", ["credito", "debito"]);

export const cartoes = pgTable("cartoes", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(),
  bandeira: text("bandeira").notNull(),
  empresa: text("empresa").notNull(),
  limite: numeric("limite", { precision: 14, scale: 2 }).notNull(),
  limiteDisponivel: numeric("limite_disponivel", {
    precision: 14,
    scale: 2,
  }).notNull(),
  diaFechamento: integer("dia_fechamento"),
  diaVencimento: integer("dia_vencimento"),
  ativo: boolean("ativo").default(true).notNull(),
  observacoes: text("observacoes"),
  contaVinculadaId: uuid("conta_vinculada_id").references(() => contas.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ESTABELECIMENTOS (Isolados por usuário)

export const estabelecimentos = pgTable(
  "estabelecimentos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nome: varchar("nome", { length: 150 }).notNull(),
    icone: varchar("icone", { length: 50 }).notNull(),
    // Localização opcional — cidade, endereço ou ponto de referência
    localizacao: varchar("localizacao", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("estabelecimentos_user_id_idx").on(table.userId),
    // Índice para busca por nome (autocomplete)
    nomeIdx: index("estabelecimentos_nome_idx").on(table.nome),
  }),
);

export type EstabelecimentoDb = typeof estabelecimentos.$inferSelect;
export type NovoEstabelecimentoDb = typeof estabelecimentos.$inferInsert;

// TRANSAÇÕES (Isoladas por usuário)

export const transacoes = pgTable("transacoes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  data: timestamp("data", { withTimezone: true }).notNull(),
  tipo: text("tipo").notNull(),
  descricao: text("descricao"),
  valor: numeric("valor", { precision: 14, scale: 2 }).notNull(),
  categoria: text("categoria"),
  formaPagamento: text("formaPagamento"),
  contaId: uuid("conta_id").references(() => contas.id),
  transferenciaId: uuid("transferencia_id"),
  cartaoId: integer("cartaoId").references(() => cartoes.id),
  estabelecimentoId: uuid("estabelecimento_id").references(
    () => estabelecimentos.id,
    { onDelete: "set null" },
  ),
  recorrente: boolean("recorrente").default(false),
  recorrenciaId: varchar("recorrenciaId", { length: 36 }),
  repeticoes: integer("repeticoes"),
  parcelado: boolean("parcelado").default(false),
  parcelamentoId: varchar("parcelamentoId", { length: 36 }),
  parcelas: integer("parcelas"),
  parcelaAtual: integer("parcelaAtual"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// FATURAS (Isoladas por usuário)

export const faturas = pgTable(
  "faturas",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cartaoId: integer("cartao_id")
      .notNull()
      .references(() => cartoes.id, { onDelete: "cascade" }),
    mes: integer("mes").notNull(),
    ano: integer("ano").notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    paga: boolean("paga").notNull().default(false),
    dataPagamento: date("data_pagamento"),
    contaPagamentoId: uuid("conta_pagamento_id").references(() => contas.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    faturaUnica: uniqueIndex("faturas_cartao_mes_ano_idx").on(
      table.cartaoId,
      table.mes,
      table.ano,
    ),
  }),
);

// EXTRATO (Isolado por usuário)

export const extratoTipoEnum = pgEnum("extrato_tipo", ["entrada", "saida"]);

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
    userContaDataIdx: index("extrato_conta_user_conta_data_idx").on(
      table.userId,
      table.contaId,
      table.data.desc(),
    ),
    referenciaIdx: index("extrato_conta_referencia_idx").on(table.referenciaId),
  }),
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
    contaDestinoIdx: index("transferencias_destino_idx").on(
      table.contaDestinoId,
    ),
    dataIdx: index("transferencias_data_idx").on(table.data.desc()),
  }),
);

// NOTIFICAÇÕES (Isolado por usuário)

export const notificacoes = pgTable("notificacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  faturas: boolean("faturas").notNull().default(true),
  limiteCartao: boolean("limite_cartao").notNull().default(true),
  saldoBaixo: boolean("saldo_baixo").notNull().default(true),
  transacoesAltas: boolean("transacoes_altas").notNull().default(false),
  diasAntesVencimento: integer("dias_antes_vencimento").notNull().default(3),
  limiteMinimoConta: integer("limite_minimo_conta").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// CONTATOS

export const contatoStatusEnum = pgEnum("contato_status", [
  "pendente",
  "em_andamento",
  "resolvido",
  "arquivado",
]);

export const contatos = pgTable(
  "contatos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nome: varchar("nome", { length: 150 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    assunto: varchar("assunto", { length: 50 }).notNull(),
    mensagem: text("mensagem").notNull(),
    status: contatoStatusEnum("status").default("pendente").notNull(),
    lido: boolean("lido").default(false).notNull(),
    userAgent: text("user_agent"),
    ip: varchar("ip", { length: 45 }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    respondidoEm: timestamp("respondido_em", { withTimezone: true }),
  },
  (table) => ({
    emailIdx: index("contatos_email_idx").on(table.email),
    statusIdx: index("contatos_status_idx").on(table.status),
    createdAtIdx: index("contatos_created_at_idx").on(table.createdAt.desc()),
    userIdIdx: index("contatos_user_id_idx").on(table.userId),
  }),
);

export type Contato = typeof contatos.$inferSelect;
export type NovoContato = typeof contatos.$inferInsert;
