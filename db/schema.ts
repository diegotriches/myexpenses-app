import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  uuid,
  numeric,
  timestamp
} from "drizzle-orm/pg-core";

// USUÁRIOS
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

// CATEGORIAS
export const categorias = pgTable("categorias", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
});

// CARTÕES
export const cartoes = pgTable("cartoes", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(),
  bandeira: text("bandeira"),
  empresa: text("empresa"),
  limite: integer("limite"),
  diaFechamento: integer("diaFechamento"),
  diaVencimento: integer("diaVencimento"),
  cor: text("cor"),
  ativo: text("ativo"),
  observacoes: text("observacoes"),
  ultimosDigitos: integer("ultimosDigitos"),
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

  contaId: uuid("conta_id")
    .notNull()
    .references(() => contas.id),

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
  tipo: varchar("tipo", { length: 20 }).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  observacoes: text("observacoes"),

  saldoInicial: numeric("saldo_inicial", { precision: 14, scale: 2 }).notNull(),
  saldoAtual: numeric("saldo_atual", { precision: 14, scale: 2 }).notNull(),

  banco: varchar("banco", { length: 100 }),
  bandeira: varchar("bandeira", { length: 50 }),
  ultimosDigitos: varchar("ultimosDigitos", { length: 4 }),
  limite: numeric("limite", { precision: 14, scale: 2 }),

  fechamentoFatura: integer("fechamento_fatura"),
  vencimentoFatura: integer("vencimento_fatura"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});