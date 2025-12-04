import { pgTable, serial, varchar, text, integer, boolean, date } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

// USUÁRIOS
export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  rendaMensal: integer("rendaMensal").default(0),
  metaEconomia: integer("metaEconomia").default(0),
  foto: text("foto"),
});

// CATEGORIAS
export const categorias = pgTable("categorias", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // "entrada" | "saida"
});

// CARTÕES
export const cartoes = pgTable("cartoes", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // "credito" | "debito"
  limite: integer("limite"),
  diaFechamento: integer("diaFechamento"),
  diaVencimento: integer("diaVencimento"),
});

// TRANSAÇÕES
export const transacoes = pgTable("transacoes", {
  id: serial("id").primaryKey(),

  data: date("data").notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // "entrada" | "saida"
  descricao: varchar("descricao", { length: 200 }),
  valor: integer("valor").notNull(),

  categoria: varchar("categoria", { length: 100 }),

  formaPagamento: varchar("formaPagamento", { length: 20 }).notNull(),
  parcela: integer("parcela").default(1),
  recorrente: boolean("recorrente").default(false),

  cartaoId: integer("cartaoId").references(() => cartoes.id),
});