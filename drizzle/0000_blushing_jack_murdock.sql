CREATE TABLE "cartoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(100) NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"limite" integer,
	"diaFechamento" integer,
	"diaVencimento" integer
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(100) NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"icon" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"data" date NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"descricao" varchar(200),
	"valor" integer NOT NULL,
	"categoria" varchar(100),
	"formaPagamento" varchar(20) NOT NULL,
	"parcela" integer DEFAULT 1,
	"recorrente" boolean DEFAULT false,
	"cartaoId" integer
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
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(100) NOT NULL,
	"email" varchar(200) NOT NULL,
	"rendaMensal" integer DEFAULT 0,
	"metaEconomia" integer DEFAULT 0,
	"foto" text
);
--> statement-breakpoint
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_cartaoId_cartoes_id_fk" FOREIGN KEY ("cartaoId") REFERENCES "public"."cartoes"("id") ON DELETE no action ON UPDATE no action;