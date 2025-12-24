CREATE TYPE "public"."extrato_origem" AS ENUM('TRANSACAO_MANUAL', 'PAGAMENTO_FATURA', 'TRANSFERENCIA', 'AJUSTE', 'ESTORNO');--> statement-breakpoint
CREATE TYPE "public"."extrato_tipo" AS ENUM('entrada', 'saida');--> statement-breakpoint
CREATE TABLE "extrato_conta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conta_id" uuid NOT NULL,
	"data" date NOT NULL,
	"tipo" "extrato_tipo" NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"descricao" text NOT NULL,
	"saldo_apos" numeric(12, 2) NOT NULL,
	"origem" "extrato_origem" NOT NULL,
	"referencia_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extrato_conta" ADD CONSTRAINT "extrato_conta_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE cascade ON UPDATE no action;