CREATE TYPE "public"."cartao_tipo" AS ENUM('credito', 'debito');--> statement-breakpoint
CREATE TYPE "public"."extrato_origem" AS ENUM('TRANSACAO_MANUAL', 'PAGAMENTO_FATURA', 'TRANSFERENCIA', 'AJUSTE', 'ESTORNO');--> statement-breakpoint
CREATE TYPE "public"."extrato_tipo" AS ENUM('entrada', 'saida');--> statement-breakpoint
CREATE TYPE "public"."tipo_categoria" AS ENUM('entrada', 'saida', 'ambos');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "cartoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"tipo" text NOT NULL,
	"bandeira" text NOT NULL,
	"empresa" text NOT NULL,
	"limite" numeric(14, 2) NOT NULL,
	"limite_disponivel" numeric(14, 2) NOT NULL,
	"dia_fechamento" integer,
	"dia_vencimento" integer,
	"ativo" boolean DEFAULT true NOT NULL,
	"observacoes" text,
	"conta_vinculada_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nome" varchar(100) NOT NULL,
	"tipo" "tipo_categoria" NOT NULL,
	"icone" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nome" varchar(150) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"observacoes" text,
	"saldo_inicial" numeric(14, 2) NOT NULL,
	"saldo_atual" numeric(14, 2) NOT NULL,
	"banco" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extrato_conta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conta_id" uuid NOT NULL,
	"data" date NOT NULL,
	"tipo" "extrato_tipo" NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"descricao" text NOT NULL,
	"saldo_apos" numeric(12, 2) NOT NULL,
	"origem" "extrato_origem" NOT NULL,
	"referencia_id" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faturas" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"cartao_id" integer NOT NULL,
	"mes" integer NOT NULL,
	"ano" integer NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"paga" boolean DEFAULT false NOT NULL,
	"data_pagamento" date,
	"conta_pagamento_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"severidade" text NOT NULL,
	"titulo" text NOT NULL,
	"mensagem" text NOT NULL,
	"lida" boolean DEFAULT false NOT NULL,
	"link" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tema" text DEFAULT 'system',
	"idioma" text DEFAULT 'pt-BR',
	"moeda" text DEFAULT 'BRL',
	"formato_data" text DEFAULT 'DD/MM/YYYY',
	"inicio_semana" text DEFAULT 'domingo',
	"notificacoes" boolean DEFAULT true,
	"notificacoes_email" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "preferencias_notificacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"faturas" boolean DEFAULT true NOT NULL,
	"limite_cartao" boolean DEFAULT true NOT NULL,
	"saldo_baixo" boolean DEFAULT true NOT NULL,
	"transacoes_altas" boolean DEFAULT false NOT NULL,
	"email_notificacoes" boolean DEFAULT false NOT NULL,
	"dias_antes_vencimento" integer DEFAULT 3 NOT NULL,
	"limite_minimo_conta" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "preferencias_notificacao_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionToken" text NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "sessions_sessionToken_unique" UNIQUE("sessionToken")
);
--> statement-breakpoint
CREATE TABLE "transacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data" timestamp with time zone NOT NULL,
	"tipo" text NOT NULL,
	"descricao" text,
	"valor" numeric(14, 2) NOT NULL,
	"categoria" text,
	"formaPagamento" text,
	"conta_id" uuid,
	"transferencia_id" uuid,
	"cartaoId" integer,
	"recorrente" boolean DEFAULT false,
	"recorrenciaId" varchar(36),
	"repeticoes" integer,
	"parcelado" boolean DEFAULT false,
	"parcelamentoId" varchar(36),
	"parcelas" integer,
	"parcelaAtual" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transferencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conta_origem_id" uuid NOT NULL,
	"conta_destino_id" uuid NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"data" date NOT NULL,
	"descricao" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"password" text,
	"reset_token" text,
	"reset_token_expiry" timestamp,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartoes" ADD CONSTRAINT "cartoes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartoes" ADD CONSTRAINT "cartoes_conta_vinculada_id_contas_id_fk" FOREIGN KEY ("conta_vinculada_id") REFERENCES "public"."contas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas" ADD CONSTRAINT "contas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extrato_conta" ADD CONSTRAINT "extrato_conta_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extrato_conta" ADD CONSTRAINT "extrato_conta_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_cartao_id_cartoes_id_fk" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_conta_pagamento_id_contas_id_fk" FOREIGN KEY ("conta_pagamento_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferencias_notificacao" ADD CONSTRAINT "preferencias_notificacao_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_cartaoId_cartoes_id_fk" FOREIGN KEY ("cartaoId") REFERENCES "public"."cartoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_conta_origem_id_contas_id_fk" FOREIGN KEY ("conta_origem_id") REFERENCES "public"."contas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_conta_destino_id_contas_id_fk" FOREIGN KEY ("conta_destino_id") REFERENCES "public"."contas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_idx" ON "accounts" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_categorias_user_tipo" ON "categorias" USING btree ("user_id","tipo");--> statement-breakpoint
CREATE INDEX "idx_categorias_nome" ON "categorias" USING btree ("nome");--> statement-breakpoint
CREATE INDEX "contas_user_id_idx" ON "contas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "extrato_conta_user_conta_data_idx" ON "extrato_conta" USING btree ("user_id","conta_id","data" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "extrato_conta_referencia_idx" ON "extrato_conta" USING btree ("referencia_id");--> statement-breakpoint
CREATE UNIQUE INDEX "faturas_cartao_mes_ano_idx" ON "faturas" USING btree ("cartao_id","mes","ano");--> statement-breakpoint
CREATE INDEX "preferences_user_id_idx" ON "preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transferencias_user_id_idx" ON "transferencias" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transferencias_origem_idx" ON "transferencias" USING btree ("conta_origem_id");--> statement-breakpoint
CREATE INDEX "transferencias_destino_idx" ON "transferencias" USING btree ("conta_destino_id");--> statement-breakpoint
CREATE INDEX "transferencias_data_idx" ON "transferencias" USING btree ("data" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_identifier_token_idx" ON "verification_tokens" USING btree ("identifier","token");