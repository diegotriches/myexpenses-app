CREATE TABLE "cartoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"tipo" text NOT NULL,
	"bandeira" text,
	"empresa" text,
	"limite" integer,
	"diaFechamento" integer,
	"diaVencimento" integer,
	"cor" text,
	"ativo" text,
	"observacoes" text,
	"ultimosDigitos" integer
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(100) NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"icon" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(150) NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"observacoes" text,
	"saldo_inicial" numeric(14, 2) NOT NULL,
	"saldo_atual" numeric(14, 2) NOT NULL,
	"banco" varchar(100),
	"bandeira" varchar(50),
	"ultimosDigitos" varchar(4),
	"limite" numeric(14, 2),
	"fechamento_fatura" integer,
	"vencimento_fatura" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faturas" (
	"id" serial PRIMARY KEY NOT NULL,
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
CREATE TABLE "transacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data" timestamp with time zone NOT NULL,
	"tipo" text NOT NULL,
	"descricao" text,
	"valor" numeric(14, 2) NOT NULL,
	"categoria" text,
	"formaPagamento" text,
	"conta_id" uuid NOT NULL,
	"transferencia_id" uuid,
	"cartaoId" integer,
	"recorrente" boolean DEFAULT false,
	"recorrenciaId" varchar(36),
	"repeticoes" integer,
	"parcelado" boolean DEFAULT false,
	"parcelamentoId" varchar(36),
	"parcelas" integer,
	"parcelaAtual" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_cartao_id_cartoes_id_fk" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_conta_pagamento_id_contas_id_fk" FOREIGN KEY ("conta_pagamento_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_cartaoId_cartoes_id_fk" FOREIGN KEY ("cartaoId") REFERENCES "public"."cartoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "faturas_cartao_mes_ano_idx" ON "faturas" USING btree ("cartao_id","mes","ano");