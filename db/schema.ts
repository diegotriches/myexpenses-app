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
    backupAutomatico: boolean("backup_automatico").default(true),
    backupFrequencia: text("backup_frequencia")
      .$type<"diario" | "semanal" | "mensal" | "desativado">()
      .default("semanal"),
    backupQuantidadeMaxima: integer("backup_quantidade_maxima").default(8),
    backupDiaSemana: integer("backup_dia_semana").default(0), // 0=dom … 6=sáb
    backupDiaMes: integer("backup_dia_mes").default(1), // 1-31
    ultimoBackupEm: timestamp("ultimo_backup_em", { withTimezone: true }),
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
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    // index simples — uniqueIndex impedia recriar conta após exclusão
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

// INVESTIMENTOS

export const aplicacoes = pgTable(
  "aplicacoes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    contaId: uuid("conta_id").notNull().references(() => contas.id, { onDelete: "cascade" }),
    descricao: text("descricao"),
    valorPrincipal: numeric("valor_principal", { precision: 14, scale: 2 }).notNull(),
    valorAtual: numeric("valor_atual", { precision: 18, scale: 8 }).notNull(),
    indexador: text("indexador").notNull(), // "cdi" | "selic"
    percentualIndexador: numeric("percentual_indexador", { precision: 6, scale: 2 }).notNull(),
    tributacao: text("tributacao", { enum: ["isento", "tributavel"] }).notNull().default("tributavel"),
    // true = cada aporte já rende a taxa do próprio dia (depende da corretora);
    // false = começa a render no dia útil seguinte
    rendeNoDiaAporte: boolean("rende_no_dia_aporte").notNull().default(false),
    dataAplicacao: timestamp("data_aplicacao", { withTimezone: true }).notNull(),
    dataVencimento: timestamp("data_vencimento", { withTimezone: true }),
    resgatada: boolean("resgatada").notNull().default(false),
    dataResgate: timestamp("data_resgate", { withTimezone: true }),
    valorResgatado: numeric("valor_resgatado", { precision: 14, scale: 2 }),
    impostoRetido: numeric("imposto_retido", { precision: 14, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("aplicacoes_user_id_idx").on(table.userId),
    contaIdIdx: index("aplicacoes_conta_id_idx").on(table.contaId),
    ativasIdx: index("aplicacoes_ativas_idx").on(table.indexador, table.resgatada, table.dataVencimento),
  }),
);
 
export const taxasDiarias = pgTable(
  "taxas_diarias",
  {
    id: serial("id").primaryKey(),
    indexador: text("indexador").notNull(),
    data: date("data").notNull(),
    taxaPercentual: numeric("taxa_percentual", { precision: 10, scale: 6 }).notNull(),
    fonte: text("fonte").notNull().default("bcb"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    indexadorDataUnq: uniqueIndex("taxas_diarias_indexador_data_idx").on(table.indexador, table.data),
  }),
);
 
export const rendimentosAplicacao = pgTable(
  "rendimentos_aplicacao",
  {
    id: serial("id").primaryKey(),
    aplicacaoId: uuid("aplicacao_id").notNull().references(() => aplicacoes.id, { onDelete: "cascade" }),
    data: date("data").notNull(),
    valorRendimento: numeric("valor_rendimento", { precision: 18, scale: 8 }).notNull(),
    taxaAplicada: numeric("taxa_aplicada", { precision: 10, scale: 6 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    aplicacaoIdIdx: index("rendimentos_aplicacao_id_idx").on(table.aplicacaoId),
    aplicacaoDataUnq: uniqueIndex("rendimentos_aplicacao_data_idx").on(table.aplicacaoId, table.data),
  }),
);
 
// Aportes: cada aporte é um "lote" com data própria — rende e paga IR
// (tabela regressiva) separadamente. Um aporte retroativo é "histórico"
// (não mexe no saldo da conta).
export const aportesAplicacao = pgTable(
  "aportes_aplicacao",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    aplicacaoId: uuid("aplicacao_id").notNull().references(() => aplicacoes.id, { onDelete: "cascade" }),
    data: date("data").notNull(),
    valor: numeric("valor", { precision: 18, scale: 2 }).notNull(),
    principalRestante: numeric("principal_restante", { precision: 18, scale: 8 }).notNull(),
    valorAtual: numeric("valor_atual", { precision: 18, scale: 8 }).notNull(),
    contaId: uuid("conta_id").references(() => contas.id, { onDelete: "set null" }),
    historico: boolean("historico").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    aplicacaoIdx: index("aportes_aplicacao_aplicacao_idx").on(table.aplicacaoId),
  }),
);

// Resgates parciais ou totais (saem dos aportes mais antigos primeiro)
export const resgatesAplicacao = pgTable(
  "resgates_aplicacao",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    aplicacaoId: uuid("aplicacao_id").notNull().references(() => aplicacoes.id, { onDelete: "cascade" }),
    data: date("data").notNull(),
    valorBruto: numeric("valor_bruto", { precision: 18, scale: 2 }).notNull(),
    tipo: text("tipo", { enum: ["parcial", "total"] }).notNull().default("parcial"),
    impostoRetido: numeric("imposto_retido", { precision: 18, scale: 2 }),
    valorLiquido: numeric("valor_liquido", { precision: 18, scale: 2 }),
    contaId: uuid("conta_id").references(() => contas.id, { onDelete: "set null" }),
    historico: boolean("historico").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    aplicacaoIdx: index("resgates_aplicacao_aplicacao_idx").on(table.aplicacaoId),
  }),
);

export type Aplicacao = typeof aplicacoes.$inferSelect;
export type NovaAplicacao = typeof aplicacoes.$inferInsert;
export type TaxaDiaria = typeof taxasDiarias.$inferSelect;
export type RendimentoAplicacao = typeof rendimentosAplicacao.$inferSelect;
export type AporteAplicacao = typeof aportesAplicacao.$inferSelect;
export type ResgateAplicacao = typeof resgatesAplicacao.$inferSelect;

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
  contaId: uuid("conta_id").references(() => contas.id, { onDelete: "set null" }),
  transferenciaId: uuid("transferencia_id"),
  cartaoId: integer("cartaoId").references(() => cartoes.id),
  estabelecimentoId: uuid("estabelecimento_id").references(
    () => estabelecimentos.id,
    { onDelete: "set null" },
  ),
  recorrente: boolean("recorrente").default(false),
  recorrenciaId: varchar("recorrenciaId", { length: 36 }),
  origemRecorrenciaId: uuid("origem_recorrencia_id").references(
    () => recorrencias.id,
    { onDelete: "set null" },
  ),
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
    limiteExtraAoPagar: numeric("limite_extra_ao_pagar", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    paga: boolean("paga").notNull().default(false),
    dataPagamento: date("data_pagamento"),
    contaPagamentoId: uuid("conta_pagamento_id").references(() => contas.id, {
      onDelete: "set null",
    }),
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

// ─── ADIANTAMENTOS DE FATURA ──────────────────────────────────────────────────
// Registra pagamentos parciais ou totais antecipados de faturas abertas.
// Diferente do pagamento normal: a fatura NÃO é marcada como paga —
// apenas o total é reduzido e o limite do cartão é restaurado.

export const adiantamentosFatura = pgTable(
  "adiantamentos_fatura",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    faturaId: integer("fatura_id")
      .notNull()
      .references(() => faturas.id, { onDelete: "cascade" }),
    contaId: uuid("conta_id").references(() => contas.id, {
      onDelete: "set null",
    }),
    valor: numeric("valor", { precision: 14, scale: 2 }).notNull(),
    descricao: text("descricao"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("adiantamentos_fatura_user_id_idx").on(table.userId),
    faturaIdIdx: index("adiantamentos_fatura_fatura_id_idx").on(table.faturaId),
  }),
);

export type AdiantamentoFatura = typeof adiantamentosFatura.$inferSelect;
export type NovoAdiantamentoFatura = typeof adiantamentosFatura.$inferInsert;

// ─── RECORRENCIA ──────────────────────────────────────────────────────────────────
// Registra

export const recorrencias = pgTable(
  "recorrencias",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    descricao: text("descricao"),
    categoria: text("categoria"),
    valor: numeric("valor", { precision: 14, scale: 2 }).notNull(),
    tipo: text("tipo").notNull(), // "entrada" | "saida"
    formaPagamento: text("forma_pagamento").notNull(), // "dinheiro" | "pix" | "cartao"
    contaId: uuid("conta_id").references(() => contas.id, {
      onDelete: "set null",
    }),
    cartaoId: integer("cartao_id").references(() => cartoes.id, {
      onDelete: "set null",
    }),
    estabelecimentoId: uuid("estabelecimento_id").references(
      () => estabelecimentos.id,
      { onDelete: "set null" },
    ),
    // Dia do mês em que a transação é gerada (1-31, com clamp pro último dia
    // do mês em meses mais curtos — mesmo padrão já usado em calcularDataVencimento)
    diaDoMes: integer("dia_do_mes").notNull(),
    dataInicio: timestamp("data_inicio", { withTimezone: true }).notNull(),
    // null = indefinida (repete até o usuário cancelar)
    repeticoesTotal: integer("repeticoes_total"),
    repeticoesGeradas: integer("repeticoes_geradas").notNull().default(0),
    ativa: boolean("ativa").notNull().default(true),
    // Evita gerar duas vezes no mesmo mês se o cron rodar mais de uma vez
    ultimaGeracaoMes: integer("ultima_geracao_mes"),
    ultimaGeracaoAno: integer("ultima_geracao_ano"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("recorrencias_user_id_idx").on(table.userId),
    ativaIdx: index("recorrencias_ativa_idx").on(table.userId, table.ativa),
  }),
);

export type Recorrencia = typeof recorrencias.$inferSelect;
export type NovaRecorrencia = typeof recorrencias.$inferInsert;

// ─── ANTECIPACOES ──────────────────────────────────────────────────────────────────

export const antecipacoesParcela = pgTable(
  "antecipacoes_parcela",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parcelamentoId: varchar("parcelamento_id", { length: 36 }).notNull(),
    cartaoId: integer("cartao_id")
      .notNull()
      .references(() => cartoes.id, { onDelete: "cascade" }),
    faturaAtualId: integer("fatura_atual_id")
      .notNull()
      .references(() => faturas.id, { onDelete: "cascade" }),
    transacaoSinteticaId: uuid("transacao_sintetica_id").notNull(),
    quantidadeAntecipada: integer("quantidade_antecipada").notNull(),
    valorFaceAntecipado: numeric("valor_face_antecipado", { precision: 14, scale: 2 }).notNull(),
    desconto: numeric("desconto", { precision: 14, scale: 2 }).notNull().default("0"),
    valorComDesconto: numeric("valor_com_desconto", { precision: 14, scale: 2 }).notNull(),
    totalParcelasOriginal: integer("total_parcelas_original").notNull(),
    valorOriginalTransacaoMesclada: numeric("valor_original_transacao_mesclada", { precision: 14, scale: 2 }),
    parcelasRemovidas: jsonb("parcelas_removidas").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("antecipacoes_parcela_user_id_idx").on(table.userId),
    parcelamentoIdx: index("antecipacoes_parcela_parcelamento_idx").on(table.parcelamentoId),
  }),
);

export type AntecipacaoParcela = typeof antecipacoesParcela.$inferSelect;
export type NovaAntecipacaoParcela = typeof antecipacoesParcela.$inferInsert;

// EXTRATO (Isolado por usuário)

export const extratoTipoEnum = pgEnum("extrato_tipo", ["entrada", "saida"]);

export const extratoOrigemEnum = pgEnum("extrato_origem", [
  "TRANSACAO_MANUAL",
  "PAGAMENTO_FATURA",
  "TRANSFERENCIA",
  "AJUSTE",
  "ESTORNO",
  "APLICACAO",
  "RESGATE_APLICACAO"
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

// ─── NOTAS ────────────────────────────────────────────────────────────────────
// Notas pessoais do usuário — acessíveis pelo painel flutuante em qualquer página.

export const notas = pgTable(
  "notas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    titulo: varchar("titulo", { length: 100 }).notNull().default(""),
    conteudo: text("conteudo").notNull().default(""),
    // Cor identificadora — valores: yellow | blue | green | red | purple | gray
    cor: varchar("cor", { length: 20 }).notNull().default("yellow"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("notas_user_id_idx").on(table.userId),
    updatedAtIdx: index("notas_updated_at_idx").on(
      table.userId,
      table.updatedAt,
    ),
  }),
);

export type Nota = typeof notas.$inferSelect;
export type NovaNota = typeof notas.$inferInsert;

// ─── BACKUPS DE USUÁRIO ───────────────────────────────────────────────────────
// Snapshot completo dos dados do usuário, gerado automaticamente uma vez por
// semana pelo cron job. Mantém histórico das últimas semanas para restauração.

export const backupsUsuario = pgTable(
  "backups_usuario",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Snapshot completo de todas as tabelas do usuário, serializado como JSON
    dados: jsonb("dados").notNull(),
    tamanhoBytes: integer("tamanho_bytes").notNull().default(0),
    // Estatísticas resumidas (contagens por tabela) para exibição rápida na UI
    estatisticas: jsonb("estatisticas"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("backups_usuario_user_id_idx").on(table.userId),
    createdAtIdx: index("backups_usuario_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export type BackupUsuario = typeof backupsUsuario.$inferSelect;
export type NovoBackupUsuario = typeof backupsUsuario.$inferInsert;



// ═══════════════════════════════════════════════════════════════════════════
// RENDA VARIÁVEL (ações, FIIs, ETFs e BDRs)
// ═══════════════════════════════════════════════════════════════════════════
// Cada compra/venda é uma linha. Posição, preço médio e resultado são
// SEMPRE calculados a partir das operações (src/utils/rendaVariavelUtils.ts),
// nunca guardados — assim excluir/importar operações nunca deixa a carteira
// inconsistente. O preço médio é por CPF (carteira única, todas as corretoras).

export const operacoesRv = pgTable(
  "operacoes_rv",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ticker: varchar("ticker", { length: 12 }).notNull(),
    tipoAtivo: text("tipo_ativo", { enum: ["acao", "fii", "etf", "bdr"] }).notNull(),
    tipo: text("tipo", { enum: ["compra", "venda"] }).notNull(),
    data: date("data").notNull(),
    quantidade: integer("quantidade").notNull(),
    precoUnitario: numeric("preco_unitario", { precision: 14, scale: 4 }).notNull(),
    // corretagem + emolumentos + taxa de liquidação etc. da operação (R$)
    taxas: numeric("taxas", { precision: 12, scale: 2 }).notNull().default("0"),
    // conta usada para pagar/receber (opcional quando é só registro histórico)
    contaId: uuid("conta_id").references(() => contas.id, { onDelete: "set null" }),
    // true = esta operação alterou o saldo da conta (precisa ser revertida ao excluir)
    movimentouConta: boolean("movimentou_conta").notNull().default(false),
    // chave do movimento na planilha de origem: impede importar o mesmo duas vezes
    origemImportacao: text("origem_importacao"),
    // eventos corporativos (ver rendaVariavelUtils)
    evento: text("evento", { enum: ["desdobramento", "bonificacao", "grupamento"] }),
    // true = a planilha só traz a data de liquidação; a do negócio foi estimada (D+2 úteis)
    dataEstimada: boolean("data_estimada").notNull().default(false),
    instituicao: text("instituicao"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userTickerIdx: index("operacoes_rv_user_ticker_idx").on(table.userId, table.ticker),
    userDataIdx: index("operacoes_rv_user_data_idx").on(table.userId, table.data),
    userOrigemUq: uniqueIndex("operacoes_rv_user_origem_uq").on(table.userId, table.origemImportacao),
  }),
);

// Última cotação conhecida de cada ticker. Na etapa 1 é preenchida à mão;
// na etapa 2 um cron passa a atualizar automaticamente (fonte = "brapi").
export const cotacoesRv = pgTable("cotacoes_rv", {
  ticker: varchar("ticker", { length: 12 }).primaryKey(),
  preco: numeric("preco", { precision: 14, scale: 4 }).notNull(),
  variacaoDia: numeric("variacao_dia", { precision: 8, scale: 4 }),
  fonte: text("fonte").notNull().default("manual"),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
});

export type OperacaoRvRow = typeof operacoesRv.$inferSelect;
export type CotacaoRvRow = typeof cotacoesRv.$inferSelect;

// Proventos recebidos (dividendos, JCP e rendimentos de FII). O valor guardado
// é o LÍQUIDO (o que de fato caiu na conta, já sem IR retido na fonte).
export const proventosRv = pgTable(
  "proventos_rv",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ticker: varchar("ticker", { length: 12 }).notNull(),
    tipo: text("tipo", { enum: ["dividendo", "jcp", "rendimento"] }).notNull(),
    data: date("data").notNull(), // data do pagamento
    quantidade: integer("quantidade"),
    precoUnitario: numeric("preco_unitario", { precision: 14, scale: 6 }),
    valorLiquido: numeric("valor_liquido", { precision: 12, scale: 2 }).notNull(),
    instituicao: text("instituicao"),
    contaId: uuid("conta_id").references(() => contas.id, { onDelete: "set null" }),
    movimentouConta: boolean("movimentou_conta").notNull().default(false),
    // ticker|data|tipo|valor|quantidade — evita lançar o mesmo provento duas vezes
    chave: text("chave").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userDataIdx: index("proventos_rv_user_data_idx").on(table.userId, table.data),
    userChaveUq: uniqueIndex("proventos_rv_user_chave_uq").on(table.userId, table.chave),
  }),
);

export type ProventoRvRow = typeof proventosRv.$inferSelect;

// Parâmetros do controle de IR (uma linha por usuário; sem linha = padrões do app)
export const irConfigRv = pgTable("ir_config_rv", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  aliquotaAcao: numeric("aliquota_acao", { precision: 5, scale: 2 }).notNull().default("15"),
  aliquotaEtf: numeric("aliquota_etf", { precision: 5, scale: 2 }).notNull().default("15"),
  aliquotaBdr: numeric("aliquota_bdr", { precision: 5, scale: 2 }).notNull().default("15"),
  aliquotaFii: numeric("aliquota_fii", { precision: 5, scale: 2 }).notNull().default("20"),
  aliquotaDayTrade: numeric("aliquota_day_trade", { precision: 5, scale: 2 }).notNull().default("20"),
  limiteIsencaoAcoes: numeric("limite_isencao_acoes", { precision: 12, scale: 2 }).notNull().default("20000"),
  prejuizoInicialComum: numeric("prejuizo_inicial_comum", { precision: 12, scale: 2 }).notNull().default("0"),
  prejuizoInicialFii: numeric("prejuizo_inicial_fii", { precision: 12, scale: 2 }).notNull().default("0"),
  prejuizoInicialDayTrade: numeric("prejuizo_inicial_day_trade", { precision: 12, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// DARFs marcados como pagos (a existência da linha = paga)
export const irDarfRv = pgTable(
  "ir_darf_rv",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    competencia: varchar("competencia", { length: 7 }).notNull(), // YYYY-MM
    valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
    pagoEm: timestamp("pago_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userCompetenciaUq: uniqueIndex("ir_darf_rv_user_competencia_uq").on(table.userId, table.competencia),
  }),
);