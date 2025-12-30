import {
  pgTable, serial, varchar, text, integer, boolean, jsonb,
  uuid, numeric, timestamp, date, uniqueIndex, pgEnum
} from "drizzle-orm/pg-core";

// USUÁRIOS
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  foto: text("foto"),
  preferencias: jsonb("preferencias").$type<{
    tema?: "light" | "dark" | "system";
    idioma?: string;
    moeda?: string;
    notificacoes?: boolean;
    notificacoesEmail?: boolean;
    formatoData?: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
    inicioSemana?: "domingo" | "segunda";
  }>(),
});

// CATEGORIAS
export const categorias = pgTable("categorias", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
});

// CARTÕES

/* Enum para tipo de cartão */
export const cartaoTipoEnum = pgEnum("cartao_tipo", [
  "credito",
  "debito",
]);

export const cartoes = pgTable("cartoes", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(),
  bandeira: text("bandeira").notNull(),
  empresa: text("empresa").notNull(),
  limite: integer("limite").notNull(),
  limiteDisponivel: integer("limite_disponivel").notNull(),
  diaFechamento: integer("dia_fechamento"),
  diaVencimento: integer("dia_vencimento"),
  ativo: boolean("ativo").default(true).notNull(),
  observacoes: text("observacoes"),
  contaVinculadaId: uuid("conta_vinculada_id").references(() => contas.id),
});

// TRANSAÇÕES
export const transacoes = pgTable("transacoes", {
  id: uuid("id").defaultRandom().primaryKey(),

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

// CONTAS
export const contas = pgTable("contas", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: varchar("nome", { length: 150 }).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  observacoes: text("observacoes"),
  saldoInicial: numeric("saldo_inicial", { precision: 14, scale: 2 }).notNull(),
  saldoAtual: numeric("saldo_atual", { precision: 14, scale: 2 }).notNull(),
  banco: varchar("banco", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// FATURAS
export const faturas = pgTable("faturas", {
  id: serial("id").primaryKey(),
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

// EXTRATO

/* Enum para tipo de movimentação */
export const extratoTipoEnum = pgEnum("extrato_tipo", [
  "entrada",
  "saida",
]);

/* Enum para origem da movimentação */
export const extratoOrigemEnum = pgEnum("extrato_origem", [
  "TRANSACAO_MANUAL",
  "PAGAMENTO_FATURA",
  "TRANSFERENCIA",
  "AJUSTE",
  "ESTORNO",
]);

export const extratoConta = pgTable("extrato_conta", {
  id: uuid("id").defaultRandom().primaryKey(),
  contaId: uuid("conta_id")
    .notNull()
    .references(() => contas.id, { onDelete: "cascade" }),
  data: date("data").notNull(),
  tipo: extratoTipoEnum("tipo").notNull(),
  valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
  descricao: text("descricao").notNull(),
  saldoApos: numeric("saldo_apos", { precision: 12, scale: 2 }).notNull(),
  origem: extratoOrigemEnum("origem").notNull(),

  /* Referência opcional (ex: faturas.id) */
  referenciaId: varchar("referencia_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});