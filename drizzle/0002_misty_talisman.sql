CREATE TYPE "public"."cartao_tipo" AS ENUM('credito', 'debito');--> statement-breakpoint
ALTER TABLE "cartoes" RENAME COLUMN "diaFechamento" TO "dia_fechamento";--> statement-breakpoint
ALTER TABLE "cartoes" RENAME COLUMN "diaVencimento" TO "dia_vencimento";