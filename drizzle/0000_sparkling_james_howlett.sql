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
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_cartaoId_cartoes_id_fk" FOREIGN KEY ("cartaoId") REFERENCES "public"."cartoes"("id") ON DELETE no action ON UPDATE no action;